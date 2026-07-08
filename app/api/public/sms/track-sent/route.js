import { jsonCors, optionsCors } from '@/lib/cors'
import { logSmsFormSent } from '@/lib/telegram'

export async function POST(req) {
	try {
		const body = await req.json()
		const { phone, name, service, leadId, source, visitDate, visitTime } =
			body || {}

		if (!phone) {
			return jsonCors({ ok: false, error: 'Missing phone' }, { status: 400 })
		}

		console.warn('[sms track-sent] received', {
			leadId: leadId || null,
			phone,
			visitDate: visitDate || null,
			visitTime: visitTime || null,
			source: source || (leadId ? 'lead' : 'manual'),
		})

		const entry = await logSmsFormSent({
			phone,
			name,
			service,
			leadId,
			source: source || (leadId ? 'lead' : 'manual'),
			visitDate,
			visitTime,
		})

		console.warn('[sms track-sent] saved', {
			id: entry?.id || null,
			leadId: entry?.leadId || null,
			phone: entry?.phone || null,
			visitDate: entry?.visitDate || null,
			visitTime: entry?.visitTime || null,
		})

		return jsonCors({ ok: true })
	} catch (error) {
		console.error('/api/public/sms/track-sent failed:', error)
		return jsonCors({ ok: false, error: 'Server error' }, { status: 500 })
	}
}

export async function OPTIONS() {
	return optionsCors('POST, OPTIONS')
}
