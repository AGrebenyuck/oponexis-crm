import { db } from '@/lib/prisma'
import {
	sendWorkOrderToTelegram,
	updateScheduleMessage,
} from '@/lib/telegram'
import { NextResponse } from 'next/server'

function parseYmdToUtcStart(str) {
	if (!str) return null
	const [y, m, d] = String(str).split('-').map(Number)
	if (!y || !m || !d) return null
	return new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
}

function parseYmdToUtcEnd(str) {
	if (!str) return null
	const [y, m, d] = String(str).split('-').map(Number)
	if (!y || !m || !d) return null
	return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
}

async function resyncRange(fromStr, toStr) {
	if (!fromStr || !toStr) {
		return {
			ok: false,
			error: 'Both "from" and "to" must be YYYY-MM-DD',
			status: 400,
		}
	}

	const fromDate = parseYmdToUtcStart(fromStr)
	const toDate = parseYmdToUtcEnd(toStr)

	if (!fromDate || !toDate || fromDate > toDate) {
		return { ok: false, error: 'Invalid date range', status: 400 }
	}

	const orders = await db.workOrder.findMany({
		where: {
			visitDate: {
				gte: fromDate,
				lte: toDate,
			},
			visitTime: {
				not: null,
			},
		},
		orderBy: [{ visitDate: 'asc' }, { visitTime: 'asc' }, { id: 'asc' }],
	})

	let sent = 0
	for (const order of orders) {
		await sendWorkOrderToTelegram(order, {
			visitDate: order.visitDate?.toISOString().slice(0, 10) || null,
			visitTime: order.visitTime,
		})
		sent++
	}

	await updateScheduleMessage()

	return {
		ok: true,
		count: orders.length,
		sent,
		status: 200,
	}
}

export async function GET(req) {
	try {
		const { searchParams } = new URL(req.url)
		const result = await resyncRange(
			searchParams.get('from'),
			searchParams.get('to')
		)
		const { status, ...payload } = result
		return NextResponse.json(payload, { status })
	} catch (error) {
		console.error('GET /api/work-orders/resync failed:', error)
		return NextResponse.json(
			{ ok: false, error: 'Server error' },
			{ status: 500 }
		)
	}
}

export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}))
		const result = await resyncRange(body.from, body.to)
		const { status, ...payload } = result
		return NextResponse.json(payload, { status })
	} catch (error) {
		console.error('POST /api/work-orders/resync failed:', error)
		return NextResponse.json(
			{ ok: false, error: 'Server error' },
			{ status: 500 }
		)
	}
}
