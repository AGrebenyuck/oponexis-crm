import { db } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req) {
	try {
		const body = await req.json()

		const {
			name,
			phone,
			serviceId,
			serviceName,
			selectedIds = [],
			selectedNames = [],
			partnerCode,
			regNumber,
			color,
			carModel,
			address,
			lat,
			lng,
			notes,
			visitDate,
			visitTime,
		} = body

		if (!name || !phone || !serviceId) {
			return NextResponse.json(
				{
					success: false,
					error: 'Name, phone and serviceId are required',
				},
				{ status: 400 }
			)
		}

		const lead = await db.lead.create({
			data: {
				name,
				phone,
				serviceId,
				serviceName,
				selectedIds,
				selectedNames,
				partnerCode: partnerCode || null,
				monthKey: new Date().toISOString().slice(0, 7),
			},
		})

		const workOrder = await db.workOrder.create({
			data: {
				leadId: lead.id,
				name,
				phone,
				service: serviceName || selectedNames?.[0] || null,
				regNumber: regNumber || null,
				color: color || null,
				carModel: carModel || null,
				address: address || null,
				lat: typeof lat === 'number' ? lat : null,
				lng: typeof lng === 'number' ? lng : null,
				notes: notes || null,
				visitDate: visitDate ? new Date(visitDate) : null,
				visitTime: visitTime || null,
			},
		})

		return NextResponse.json({
			success: true,
			data: {
				lead,
				workOrder,
			},
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error.message,
			},
			{ status: 500 }
		)
	}
}
