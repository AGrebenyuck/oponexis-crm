import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'

function normalizeRecipients(recipients = []) {
	const seen = new Set()
	return recipients
		.map(item => ({
			customerId: item.customerId || item.id || null,
			name: item.name || null,
			phone: String(item.phone || '').trim(),
		}))
		.filter(item => {
			if (!item.phone || seen.has(item.phone)) return false
			seen.add(item.phone)
			return true
		})
}

export async function GET() {
	try {
		const campaigns = await db.smsCampaign.findMany({
			orderBy: { createdAt: 'desc' },
			include: { recipients: true },
			take: 100,
		})

		return NextResponse.json({
			success: true,
			data: campaigns.map(campaign => ({
				...campaign,
				stats: {
					total: campaign.recipients.length,
					pending: campaign.recipients.filter(item => item.status === 'PENDING').length,
					queued: campaign.recipients.filter(item => item.status === 'QUEUED').length,
					sent: campaign.recipients.filter(item => item.status === 'SENT').length,
					delivered: campaign.recipients.filter(item => item.status === 'DELIVERED').length,
					failed: campaign.recipients.filter(item => item.status === 'FAILED').length,
				},
			})),
		})
	} catch (error) {
		console.error('GET /api/admin/sms-campaigns failed:', error)
		return NextResponse.json(
			{ success: false, error: error.message || 'Nie udało się pobrać kampanii.' },
			{ status: 500 }
		)
	}
}

export async function POST(req) {
	try {
		const body = await req.json()
		const recipients = normalizeRecipients(body.recipients)
		if (!body.name?.trim() || !body.message?.trim()) {
			return NextResponse.json(
				{ success: false, error: 'Nazwa i treść SMS są wymagane.' },
				{ status: 400 }
			)
		}
		if (!recipients.length) {
			return NextResponse.json(
				{ success: false, error: 'Wybierz przynajmniej jednego odbiorcę.' },
				{ status: 400 }
			)
		}

		const data = {
			name: body.name.trim(),
			message: body.message.trim(),
			status: body.scheduledAt ? 'SCHEDULED' : 'DRAFT',
			delaySeconds: Number(body.delaySeconds || 7),
			sourceSeason: Array.isArray(body.filters?.seasons)
				? body.filters.seasons.join(',')
				: null,
			sourceYear: body.filters?.year ? Number(body.filters.year) : null,
			filters: body.filters || null,
			recipients: {
				create: recipients.map(item => ({
					customerId: item.customerId,
					name: item.name,
					phone: item.phone,
				})),
			},
		}
		if (body.scheduledAt) {
			data.scheduledAt = new Date(body.scheduledAt)
		}

		const campaign = await db.smsCampaign.create({
			data,
			include: { recipients: true },
		})

		return NextResponse.json({ success: true, data: campaign })
	} catch (error) {
		console.error('POST /api/admin/sms-campaigns failed:', error)
		return NextResponse.json(
			{ success: false, error: error.message || 'Nie utworzono kampanii.' },
			{ status: 500 }
		)
	}
}
