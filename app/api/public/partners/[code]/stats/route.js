import { jsonCors, optionsCors } from '@/lib/cors'
import { db } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req, context) {
	try {
		const params = await context.params
		const code = params.code

		const url = new URL(req.url)
		const months = Number(url.searchParams.get('months') || 12)
		const days = Number(url.searchParams.get('days') || 30)

		const partner = await db.partner.findUnique({ where: { code } })
		if (!partner) return jsonCors({ ok: false }, { status: 404 })

		const hits = await db.referralHit.findMany({ where: { partnerCode: code } })
		const uniqueVisitors = new Set(hits.map(hit => hit.visitorId)).size

		const reservations = await db.reservation.findMany({
			where: { partnerCode: code },
			select: { createdAt: true, partnerCommissionAmount: true },
		})
		const orders = reservations.length
		const commissionTotal = reservations.reduce(
			(sum, row) => sum + (row.partnerCommissionAmount || 0),
			0
		)
		const callsTotal = await db.callIntent.count({ where: { partnerCode: code } })
		const cr = uniqueVisitors ? orders / uniqueVisitors : 0

		const byDayVisits = new Map()
		for (const hit of hits) {
			byDayVisits.set(hit.day, (byDayVisits.get(hit.day) || 0) + 1)
		}

		const callsAll = await db.callIntent.findMany({
			where: { partnerCode: code },
			select: { createdAt: true },
			orderBy: { createdAt: 'asc' },
		})
		const byDayCalls = new Map()
		for (const call of callsAll) {
			const day = call.createdAt.toISOString().slice(0, 10)
			byDayCalls.set(day, (byDayCalls.get(day) || 0) + 1)
		}

		const allDays = Array.from(
			new Set([...byDayVisits.keys(), ...byDayCalls.keys()])
		).sort()
		const lastDays = days > 0 ? allDays.slice(-days) : allDays
		const daily = lastDays.map(date => ({
			date,
			visitors: byDayVisits.get(date) || 0,
			calls: byDayCalls.get(date) || 0,
		}))

		const from = new Date()
		from.setMonth(from.getMonth() - (months - 1))
		from.setDate(1)
		from.setHours(0, 0, 0, 0)

		const ym = date =>
			`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
		const fromMonth = from.toISOString().slice(0, 7)
		const byMonth = new Map()

		for (const hit of hits) {
			const key = hit.day.slice(0, 7)
			if (key < fromMonth) continue
			const current = byMonth.get(key) || {
				visits: 0,
				calls: 0,
				orders: 0,
				commission: 0,
			}
			current.visits += 1
			byMonth.set(key, current)
		}

		const callsWindow = await db.callIntent.findMany({
			where: { partnerCode: code, createdAt: { gte: from } },
			select: { createdAt: true },
			orderBy: { createdAt: 'asc' },
		})
		for (const call of callsWindow) {
			const key = ym(call.createdAt)
			const current = byMonth.get(key) || {
				visits: 0,
				calls: 0,
				orders: 0,
				commission: 0,
			}
			current.calls += 1
			byMonth.set(key, current)
		}

		for (const reservation of reservations) {
			if (reservation.createdAt < from) continue
			const key = ym(reservation.createdAt)
			const current = byMonth.get(key) || {
				visits: 0,
				calls: 0,
				orders: 0,
				commission: 0,
			}
			current.orders += 1
			current.commission += reservation.partnerCommissionAmount || 0
			byMonth.set(key, current)
		}

		const monthly = []
		const cursor = new Date(from)
		const end = new Date()
		end.setDate(1)
		end.setHours(0, 0, 0, 0)

		while (cursor <= end) {
			const key = ym(cursor)
			const row = byMonth.get(key) || {
				visits: 0,
				calls: 0,
				orders: 0,
				commission: 0,
			}
			monthly.push({
				month: key,
				visits: row.visits,
				calls: row.calls,
				orders: row.orders,
				commission: Number(row.commission.toFixed(2)),
			})
			cursor.setMonth(cursor.getMonth() + 1)
		}

		return jsonCors({
			ok: true,
			totals: {
				uniqueVisitors,
				orders,
				calls: callsTotal,
				cr,
				commission: Number(commissionTotal.toFixed(2)),
				commissionPct: partner.commissionPct,
			},
			daily,
			monthly,
		})
	} catch (error) {
		console.error('/api/public/partners/[code]/stats failed:', error)
		return jsonCors({ ok: false, error: 'Server error' }, { status: 500 })
	}
}

export async function OPTIONS() {
	return optionsCors('GET, OPTIONS')
}
