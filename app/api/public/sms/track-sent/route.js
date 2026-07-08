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

		await logSmsFormSent({
			phone,
			name,
			service,
			leadId,
			source: source || (leadId ? 'lead' : 'manual'),
			visitDate,
			visitTime,
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
