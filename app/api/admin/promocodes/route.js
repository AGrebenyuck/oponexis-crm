import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'

function numberOrNull(value) {
	if (value === '' || value === null || value === undefined) return null
	const number = Number(value)
	return Number.isFinite(number) ? number : null
}

function promoData(promo) {
	const validUntil = promo.validUntil ? new Date(promo.validUntil) : null

	return {
		code: String(promo.code || '')
			.trim()
			.toUpperCase(),
		type: promo.type || 'percentage',
		value: Number(promo.value) || 0,
		uses: Number(promo.uses) || 0,
		maxUses: numberOrNull(promo.maxUses),
		validUntil: validUntil && !Number.isNaN(validUntil.getTime()) ? validUntil : null,
	}
}

export async function GET() {
	try {
		const promocodes = await db.promoCode.findMany({
			orderBy: { createdAt: 'desc' },
		})

		return NextResponse.json({ success: true, data: promocodes })
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
		const promocodes = Array.isArray(body.promocodes) ? body.promocodes : []
		const existing = await db.promoCode.findMany({ select: { id: true } })
		const incomingIds = new Set(
			promocodes.filter(promo => promo.id && !promo.isNew).map(p => p.id)
		)
		const deletedIds = existing
			.map(promo => promo.id)
			.filter(id => !incomingIds.has(id))

		await db.$transaction(async tx => {
			for (const id of deletedIds) {
				await tx.promoCode.delete({ where: { id } })
			}

			for (const promo of promocodes) {
				if (!promo.code?.trim()) continue

				if (promo.id && !promo.isNew) {
					await tx.promoCode.update({
						where: { id: promo.id },
						data: promoData(promo),
					})
				} else {
					await tx.promoCode.create({ data: promoData(promo) })
				}
			}
		})

		const updated = await db.promoCode.findMany({
			orderBy: { createdAt: 'desc' },
		})

		return NextResponse.json({ success: true, data: updated })
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: error.message },
			{ status: 500 }
		)
	}
}
