import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'

function numberOrNull(value) {
	if (value === '' || value === null || value === undefined) return null
	const number = Number(value)
	return Number.isFinite(number) ? number : null
}

function additionalServicesCreate(service) {
	return (service.additionalServices || [])
		.filter(item => item.name?.trim())
		.map(item => ({
			name: item.name.trim(),
			description: item.description?.trim() || null,
			price: Number(item.price) || 0,
		}))
}

function serviceData(service, { replaceAdditional = false } = {}) {
	const data = {
		name: String(service.name || '').trim(),
		description: service.description?.trim() || null,
		duration: Number(service.duration) || 30,
		price: Number(service.price) || 0,
		originalPrice: numberOrNull(service.originalPrice),
	}

	const create = additionalServicesCreate(service)
	if (replaceAdditional) {
		data.additionalServices = {
			deleteMany: {},
			create,
		}
	} else if (create.length) {
		data.additionalServices = { create }
	}

	return data
}

function serializeService(service) {
	return {
		...service,
		createdAt: service.createdAt?.toISOString?.() || service.createdAt,
		updatedAt: service.updatedAt?.toISOString?.() || service.updatedAt,
		additionalServices: (service.additionalServices || []).map(item => ({
			...item,
			createdAt: item.createdAt?.toISOString?.() || item.createdAt,
			updatedAt: item.updatedAt?.toISOString?.() || item.updatedAt,
		})),
	}
}

export async function GET() {
	try {
		const services = await db.service.findMany({
			orderBy: { createdAt: 'asc' },
			include: { additionalServices: { orderBy: { createdAt: 'asc' } } },
		})

		return NextResponse.json({
			success: true,
			data: services.map(serializeService),
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
		const services = Array.isArray(body.services) ? body.services : []
		const existing = await db.service.findMany({ select: { id: true } })
		const incomingIds = new Set(
			services.filter(service => service.id && !service.isNew).map(s => s.id)
		)
		const deletedIds = existing
			.map(service => service.id)
			.filter(id => !incomingIds.has(id))

		await db.$transaction(async tx => {
			for (const id of deletedIds) {
				await tx.service.delete({ where: { id } })
			}

			for (const service of services) {
				if (!service.name?.trim()) continue

				if (service.id && !service.isNew) {
					await tx.service.update({
						where: { id: service.id },
						data: serviceData(service, { replaceAdditional: true }),
					})
				} else {
					await tx.service.create({ data: serviceData(service) })
				}
			}
		})

		const updated = await db.service.findMany({
			orderBy: { createdAt: 'asc' },
			include: { additionalServices: { orderBy: { createdAt: 'asc' } } },
		})

		return NextResponse.json({
			success: true,
			data: updated.map(serializeService),
		})
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: error.message },
			{ status: 500 }
		)
	}
}
