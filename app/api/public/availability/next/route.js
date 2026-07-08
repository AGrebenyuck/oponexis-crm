import { jsonCors, optionsCors } from '@/lib/cors'
import { db } from '@/lib/prisma'
import { DateTime } from 'luxon'

const ZONE = 'Europe/Warsaw'
const WORK_DAY_START_MIN = 12 * 60
const WORK_DAY_END_MIN = 20 * 60
const SLOT_STEP_MIN = 15
const DEFAULT_DURATION_MIN = 60
const TRAVEL_BUFFER_MIN = 30

function timeToMinutes(str) {
	if (!str) return null
	const [h, m] = String(str).split(':').map(Number)
	if (Number.isNaN(h) || Number.isNaN(m)) return null
	return h * 60 + m
}

function minutesToTime(min) {
	const h = Math.floor(min / 60)
	const m = min % 60
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getDurationForOrder(order, durationByName) {
	if (!order?.service) return DEFAULT_DURATION_MIN

	const parts = order.service
		.split('+')
		.map(p => p.trim().toLowerCase())
		.filter(Boolean)

	const durations = parts
		.map(name => durationByName.get(name))
		.filter(d => typeof d === 'number' && d > 0)

	return durations.length ? Math.max(...durations) : DEFAULT_DURATION_MIN
}

function buildBusyIntervalsForDay(ordersForDay, durationByName) {
	const intervals = []

	for (const order of ordersForDay) {
		const startMin = timeToMinutes(order.visitTime)
		if (startMin == null) continue

		const endMin = startMin + getDurationForOrder(order, durationByName)
		if (endMin <= WORK_DAY_START_MIN || startMin >= WORK_DAY_END_MIN) continue

		const start = Math.max(startMin, WORK_DAY_START_MIN)
		const end = Math.min(endMin, WORK_DAY_END_MIN)
		if (end > start) intervals.push([start, end])
	}

	intervals.sort((a, b) => a[0] - b[0])

	const merged = []
	for (const [start, end] of intervals) {
		const last = merged[merged.length - 1]
		if (last && start <= last[1]) {
			last[1] = Math.max(last[1], end)
		} else {
			merged.push([start, end])
		}
	}

	return merged
}

function buildFreeIntervalsFromBusy(busy, dayStartMin, dayEndMin) {
	const free = []
	let cursor = dayStartMin

	for (const [busyStart, busyEnd] of busy) {
		if (busyEnd <= dayStartMin || busyStart >= dayEndMin) continue

		const start = Math.max(busyStart, dayStartMin)
		const end = Math.min(busyEnd, dayEndMin)

		if (start > cursor) free.push([cursor, start])
		cursor = Math.max(cursor, end)
	}

	if (cursor < dayEndMin) free.push([cursor, dayEndMin])
	return free
}

function applyTravelBuffer(free) {
	return free
		.map(([start, end]) => [start + TRAVEL_BUFFER_MIN, end - TRAVEL_BUFFER_MIN])
		.filter(([start, end]) => end - start >= 30)
}

function intervalsToRanges(intervals) {
	return intervals
		.filter(([start, end]) => end - start >= 15)
		.map(([start, end]) => `${minutesToTime(start)}–${minutesToTime(end)}`)
}

function buildFlatSlotsLabel(dayLabel, freeIntervals, limit) {
	const slots = []

	for (const [start, end] of freeIntervals) {
		for (let time = start; time + 15 <= end; time += SLOT_STEP_MIN) {
			slots.push(`${dayLabel} ${minutesToTime(time)}`)
			if (slots.length >= limit) return slots
		}
	}

	return slots
}

export async function GET(req) {
	try {
		const { searchParams } = new URL(req.url)
		const limit = Number(searchParams.get('limit') || '12') || 12

		const now = DateTime.now().setZone(ZONE)
		const today = now.startOf('day')
		const tomorrow = today.plus({ days: 1 })
		const afterTomorrow = today.plus({ days: 2 })

		const days = [today, tomorrow, afterTomorrow]
		const orders = await db.workOrder.findMany({
			where: {
				visitDate: {
					gte: today.toJSDate(),
					lt: afterTomorrow.plus({ days: 1 }).toJSDate(),
				},
				visitTime: { not: null },
			},
			orderBy: [{ visitDate: 'asc' }, { visitTime: 'asc' }, { id: 'asc' }],
		})

		const services = await db.service.findMany({
			select: { name: true, duration: true },
		})
		const durationByName = new Map(
			services
				.filter(s => s.name && typeof s.duration === 'number')
				.map(s => [s.name.trim().toLowerCase(), s.duration])
		)

		const ordersByDayKey = new Map()
		for (const order of orders) {
			if (!order.visitDate) continue
			const key = DateTime.fromJSDate(order.visitDate, { zone: ZONE }).toISODate()
			if (!ordersByDayKey.has(key)) ordersByDayKey.set(key, [])
			ordersByDayKey.get(key).push(order)
		}

		const nowMinutes = now.hour * 60 + now.minute
		const todayStartMin = Math.max(WORK_DAY_START_MIN, nowMinutes)

		const buildDay = (date, isToday) => {
			const key = date.toISODate()
			const busy = buildBusyIntervalsForDay(
				ordersByDayKey.get(key) || [],
				durationByName
			)
			const dayStart = isToday ? todayStartMin : WORK_DAY_START_MIN

			if (dayStart >= WORK_DAY_END_MIN) return { ranges: [], free: [] }

			const freeRaw = buildFreeIntervalsFromBusy(
				busy,
				dayStart,
				WORK_DAY_END_MIN
			)
			const free = applyTravelBuffer(freeRaw)
			return { ranges: intervalsToRanges(free), free }
		}

		const [todayStruct, tomorrowStruct, nextStruct] = days.map((day, index) =>
			buildDay(day, index === 0)
		)

		const slots = []
		if (todayStruct.free.length) {
			slots.push(
				...buildFlatSlotsLabel('Dzis', todayStruct.free, limit - slots.length)
			)
		}
		if (slots.length < limit && tomorrowStruct.free.length) {
			slots.push(
				...buildFlatSlotsLabel(
					'Jutro',
					tomorrowStruct.free,
					limit - slots.length
				)
			)
		}
		if (slots.length < limit && nextStruct.free.length) {
			slots.push(
				...buildFlatSlotsLabel(
					'Pojutrze',
					nextStruct.free,
					limit - slots.length
				)
			)
		}

		return jsonCors({
			ok: true,
			days: {
				today: { ranges: todayStruct.ranges },
				tomorrow: { ranges: tomorrowStruct.ranges },
				next: { ranges: nextStruct.ranges },
			},
			slots,
		})
	} catch (error) {
		console.error('/api/public/availability/next failed:', error)
		return jsonCors({ ok: false, error: 'Server error' }, { status: 500 })
	}
}

export async function OPTIONS() {
	return optionsCors('GET, OPTIONS')
}
