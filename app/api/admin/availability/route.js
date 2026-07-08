import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'
import {
	availabilityToCalendarDays,
	calendarToAvailability,
} from '@/lib/admin/availability'

export async function GET() {
	try {
		const calendar = await db.calendar.findFirst({
			include: { days: true },
		})

		return NextResponse.json({
			success: true,
			data: calendarToAvailability(calendar),
		})
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: error.message },
			{ status: 500 }
		)
	}
}

export async function PUT(req) {
	try {
		const body = await req.json()
		const days = availabilityToCalendarDays(body)
		const timeGap = Number(body.timeGap) || 30
		const existing = await db.calendar.findFirst()

		if (existing) {
			await db.calendar.update({
				where: { id: existing.id },
				data: {
					timeGap,
					days: {
						deleteMany: {},
						create: days,
					},
				},
			})
		} else {
			await db.calendar.create({
				data: {
					timeGap,
					days: { create: days },
				},
			})
		}

		const calendar = await db.calendar.findFirst({ include: { days: true } })
		return NextResponse.json({
			success: true,
			data: calendarToAvailability(calendar),
		})
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: error.message },
			{ status: 500 }
		)
	}
}
