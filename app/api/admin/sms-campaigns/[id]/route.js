import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'

export async function GET(_req, { params }) {
	try {
		const { id } = await params
		const campaign = await db.smsCampaign.findUnique({
			where: { id },
			include: { recipients: { orderBy: { createdAt: 'asc' } } },
		})
		if (!campaign) {
			return NextResponse.json(
				{ success: false, error: 'Nie znaleziono kampanii.' },
				{ status: 404 }
			)
		}
		return NextResponse.json({ success: true, data: campaign })
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: error.message || 'Błąd kampanii.' },
			{ status: 500 }
		)
	}
}

export async function PATCH(req, { params }) {
	try {
		const { id } = await params
		const body = await req.json()
		const updated = await db.smsCampaign.update({
			where: { id },
			data: {
				name: body.name,
				message: body.message,
				delaySeconds:
					body.delaySeconds == null ? undefined : Number(body.delaySeconds),
				scheduledAt:
					body.scheduledAt === undefined
						? undefined
						: body.scheduledAt
							? new Date(body.scheduledAt)
							: null,
				status:
					body.scheduledAt === undefined
						? undefined
						: body.scheduledAt
							? 'SCHEDULED'
							: 'DRAFT',
			},
			include: { recipients: true },
		})
		return NextResponse.json({ success: true, data: updated })
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: error.message || 'Nie zapisano kampanii.' },
			{ status: 500 }
		)
	}
}

export async function DELETE(_req, { params }) {
	try {
		const { id } = await params
		await db.smsCampaign.delete({ where: { id } })
		return NextResponse.json({ success: true })
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: error.message || 'Nie usunięto kampanii.' },
			{ status: 500 }
		)
	}
}
