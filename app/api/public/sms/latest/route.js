import { jsonCors, optionsCors } from '@/lib/cors'
import { normalizePhone } from '@/lib/date'
import { db } from '@/lib/prisma'

export async function GET(req) {
	try {
		const { searchParams } = new URL(req.url)
		const leadId = searchParams.get('leadId') || ''
		const rawPhone = searchParams.get('phone') || ''
		const phone = normalizePhone(rawPhone) || rawPhone.trim()

		if (!leadId && !phone) {
			return jsonCors({ ok: false, error: 'Missing leadId or phone' }, { status: 400 })
		}

		const log = await db.smsFormLog.findFirst({
			where: {
				status: 'pending',
				OR: [
					leadId ? { leadId } : null,
					phone ? { phone } : null,
					rawPhone && rawPhone !== phone ? { phone: rawPhone } : null,
				].filter(Boolean),
			},
			orderBy: [{ visitDate: 'desc' }, { sentAt: 'desc' }, { id: 'desc' }],
		})

		console.info('[sms latest] lookup', {
			leadId: leadId || null,
			phone: phone || null,
			foundId: log?.id || null,
			visitDate: log?.visitDate || null,
			visitTime: log?.visitTime || null,
		})

		return jsonCors({
			ok: true,
			data: log
				? {
						id: log.id,
						visitDate: log.visitDate
							? log.visitDate.toISOString().slice(0, 10)
							: null,
						visitTime: log.visitTime || null,
				  }
				: null,
		})
	} catch (error) {
		console.error('/api/public/sms/latest failed:', {
			error: error?.message || String(error),
			stack: error?.stack || null,
		})
		return jsonCors({ ok: false, error: 'Server error' }, { status: 500 })
	}
}

export async function OPTIONS() {
	return optionsCors('GET, OPTIONS')
}
