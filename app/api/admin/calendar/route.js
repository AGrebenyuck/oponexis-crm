import { DateTime } from 'luxon'
import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'
import { realReservationWhere, realWorkOrderWhere } from '@/lib/test-data'

const ZONE = 'Europe/Warsaw'

export async function GET() {
	try {
		const startOfMonth = DateTime.now()
			.setZone(ZONE)
			.startOf('month')
			.toJSDate()
		const [workOrders, reservations] = await Promise.all([
			db.workOrder.findMany({
				where: realWorkOrderWhere({ visitDate: { gte: startOfMonth } }),
				orderBy: [{ visitDate: 'asc' }, { visitTime: 'asc' }],
				take: 500,
			}),
			db.reservation.findMany({
				where: realReservationWhere({ startTime: { gte: startOfMonth } }),
				orderBy: { startTime: 'asc' },
				include: {
					user: true,
					services: { include: { service: true } },
				},
				take: 500,
			}),
		])

		const events = [
			...workOrders.map(order => ({
				id: `work-${order.id}`,
				type: 'workOrder',
				title: order.service || 'Zlecenie',
				name: order.name,
				phone: order.phone,
				address: order.address,
				start: order.visitDate
					? DateTime.fromJSDate(order.visitDate, { zone: ZONE })
							.set({
								hour: Number(order.visitTime?.slice(0, 2) || 9),
								minute: Number(order.visitTime?.slice(3, 5) || 0),
							})
							.toISO()
					: null,
			})),
			...reservations.map(reservation => ({
				id: `reservation-${reservation.id}`,
				type: 'reservation',
				title: reservation.serviceName || 'Rezerwacja',
				name: reservation.user?.name || reservation.contactInfo,
				phone: reservation.contactInfo,
				address: reservation.address,
				start: reservation.startTime.toISOString(),
				end: reservation.endTime.toISOString(),
				price: reservation.price,
			})),
		].filter(event => event.start)

		return NextResponse.json({ success: true, data: events })
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: error.message },
			{ status: 500 }
		)
	}
}
