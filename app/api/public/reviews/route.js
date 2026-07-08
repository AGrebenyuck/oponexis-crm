import { db } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const CACHE_ID = 'google'

function corsHeaders() {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	}
}

function getReviewId(review) {
	return (
		review.id ||
		review.author_url ||
		`${review.author_name || 'google'}-${review.time || ''}-${
			review.rating || ''
		}`
	)
}

function normalizeReview(review) {
	return {
		...review,
		id: getReviewId(review),
		text: review.text || '',
		rating: review.rating ?? null,
		time: review.time ?? 0,
		author_name: review.author_name || 'Użytkownik Google',
		profile_photo_url: review.profile_photo_url || null,
		author_url: review.author_url || null,
		relative_time_description: review.relative_time_description || null,
	}
}

function mergeReviews(oldReviews = [], freshReviews = []) {
	const map = new Map()

	for (const review of oldReviews) {
		const normalized = normalizeReview(review)
		map.set(normalized.id, normalized)
	}

	for (const review of freshReviews) {
		const fresh = normalizeReview(review)
		const old = map.get(fresh.id)

		map.set(fresh.id, {
			...old,
			...fresh,
			text: fresh.text || old?.text || '',
		})
	}

	return Array.from(map.values()).sort((a, b) => (b.time || 0) - (a.time || 0))
}

async function fetchGoogleReviews() {
	const apiKey = process.env.GOOGLE_API_KEY
	const placeId = process.env.GOOGLE_PLACE_ID

	if (!apiKey || !placeId) {
		throw new Error('GOOGLE_API_KEY or GOOGLE_PLACE_ID is missing')
	}

	const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')

	url.searchParams.set('place_id', placeId)
	url.searchParams.set('key', apiKey)
	url.searchParams.set('language', 'pl')
	url.searchParams.set('fields', 'rating,user_ratings_total,url,reviews')

	const res = await fetch(url.toString(), {
		cache: 'no-store',
	})

	const json = await res.json()

	if (json.status !== 'OK') {
		throw new Error(json.error_message || `Google API error: ${json.status}`)
	}

	const result = json.result || {}

	return {
		rating: result.rating ?? null,
		total: result.user_ratings_total ?? null,
		url: result.url ?? '#',
		reviews: Array.isArray(result.reviews) ? result.reviews : [],
	}
}

function isCacheStale(row) {
	if (!row?.updatedAt) return true

	const ttlHours = Number(process.env.GOOGLE_REVIEWS_TTL_HOURS || 24)
	const ttlMs = ttlHours * 60 * 60 * 1000

	return Date.now() - new Date(row.updatedAt).getTime() > ttlMs
}

async function refreshGoogleReviews(row) {
	const fresh = await fetchGoogleReviews()

	const oldPayload = row?.payload || {}
	const oldReviews = Array.isArray(oldPayload.reviews) ? oldPayload.reviews : []

	const mergedReviews = mergeReviews(oldReviews, fresh.reviews)

	const payload = {
		rating: fresh.rating,
		total: fresh.total,
		url: fresh.url,
		reviews: mergedReviews,
	}

	return db.googleReviewsCache.upsert({
		where: {
			id: CACHE_ID,
		},
		update: {
			payload,
			rating: fresh.rating,
			total: fresh.total,
			url: fresh.url,
		},
		create: {
			id: CACHE_ID,
			payload,
			rating: fresh.rating,
			total: fresh.total,
			url: fresh.url,
		},
	})
}

function formatResponse(row, { limit, minRating }) {
	if (!row?.payload) return null

	const payload = row.payload
	const reviews = Array.isArray(payload.reviews) ? payload.reviews : []

	const selected = reviews
		.filter(
			review =>
				(review.text || '').trim().length > 0 &&
				Number(review.rating || 0) >= minRating
		)
		.sort((a, b) => (b.time || 0) - (a.time || 0))
		.slice(0, limit)

	return {
		rating: row.rating ?? payload.rating ?? null,
		total: row.total ?? payload.total ?? null,
		url: row.url ?? payload.url ?? '#',
		reviews: selected,
		updatedAt: row.updatedAt,
	}
}

export async function GET(req) {
	try {
		const { searchParams } = new URL(req.url)

		const limit = Math.max(
			1,
			Math.min(24, Number(searchParams.get('limit') || 24))
		)

		const minRating = Number(searchParams.get('minRating') || 4)

		let row = await db.googleReviewsCache.findUnique({
			where: {
				id: CACHE_ID,
			},
		})

		if (isCacheStale(row)) {
			try {
				row = await refreshGoogleReviews(row)
			} catch (error) {
				console.error('[google-reviews-refresh]', error)

				if (!row) {
					return NextResponse.json(
						{
							success: false,
							error: error.message,
						},
						{
							status: 500,
							headers: corsHeaders(),
						}
					)
				}
			}
		}

		return NextResponse.json(
			{
				success: true,
				data: formatResponse(row, { limit, minRating }),
			},
			{
				headers: corsHeaders(),
			}
		)
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error.message,
			},
			{
				status: 500,
				headers: corsHeaders(),
			}
		)
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: corsHeaders(),
	})
}
