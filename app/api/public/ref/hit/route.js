import { jsonCors, optionsCors } from '@/lib/cors'
import { db } from '@/lib/prisma'

export async function POST(req) {
	try {
		const { code, visitorId } = await req.json().catch(() => ({}))

		if (!code || !visitorId) {
			return jsonCors({ ok: false }, { status: 400 })
		}

		const partner = await db.partner.findUnique({
			where: { code },
		})
		if (!partner) {
			return jsonCors({ ok: false, reason: 'no-partner' }, { status: 404 })
		}

		const day = new Date().toISOString().slice(0, 10)

		await db.referralHit
			.create({
				data: {
					partnerCode: partner.code,
					visitorId,
					day,
				},
			})
			.catch(() => {})

		return jsonCors({ ok: true })
	} catch (error) {
		console.error('/api/public/ref/hit failed:', error)
		return jsonCors({ ok: false, error: 'Server error' }, { status: 500 })
	}
}

export async function OPTIONS() {
	return optionsCors('POST, OPTIONS')
}
