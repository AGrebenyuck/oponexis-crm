import { jsonCors, optionsCors } from '@/lib/cors'
import {
	normalizeOptionalText,
	normalizePhone,
	parseYmdToUtcDate,
} from '@/lib/date'
import { upsertCustomerFromContact } from '@/lib/customer'
import { db } from '@/lib/prisma'
import {
	markSmsFormCompletedByLead,
	markSmsFormCompletedByPhone,
	sendWorkOrderToTelegram,
	updateIncompleteCompletionMessage,
	updateScheduleMessage,
	updateWorkOrderMessage,
} from '@/lib/telegram'

function normalizeWheelRimSize(value) {
	const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
	if (!raw) return null
	const normalized = raw.startsWith('R') ? raw : `R${raw}`
	return /^R(1[3-9]|2[0-2])$/.test(normalized) ? normalized : null
}

async function findExistingWorkOrder({ leadId, phone, visitDateObj, visitTime }) {
	if (!visitDateObj || !visitTime) return null

	if (leadId) {
		const byLeadAndSlot = await db.workOrder.findFirst({
			where: { leadId, visitDate: visitDateObj, visitTime },
			orderBy: { id: 'desc' },
		})
		if (byLeadAndSlot) return byLeadAndSlot
	}

	if (phone) {
		const byPhoneAndSlot = await db.workOrder.findFirst({
			where: { phone, visitDate: visitDateObj, visitTime },
			orderBy: { id: 'desc' },
		})
		if (byPhoneAndSlot) return byPhoneAndSlot
	}

	return null
}

export async function POST(req) {
	try {
		const body = await req.json()
		const {
			leadId,
			name,
			phone,
			service,
			regNumber,
			color,
			carModel,
			address,
			lat,
			lng,
			notes,
			visitDate,
			visitTime,
			wheelRimSize,
			tireSize,
			wantsInvoice,
			invoiceNip,
			invoiceEmail,
		} = body || {}

		if (!name?.trim() || !phone?.trim()) {
			return jsonCors(
				{ ok: false, error: 'Brak wymaganych danych (imie, telefon)' },
				{ status: 400 }
			)
		}

		const normalizedWheelRimSize = normalizeWheelRimSize(wheelRimSize)
		if (!normalizedWheelRimSize) {
			return jsonCors(
				{ ok: false, error: 'Prosimy wybrac poprawny rozmiar felgi.' },
				{ status: 400 }
			)
		}

		const normalizedPhone = normalizePhone(phone) || phone.trim()
		const visitDateObj = parseYmdToUtcDate(visitDate)
		const customer = await upsertCustomerFromContact({
			phone: normalizedPhone,
			name,
			source: leadId ? 'lead' : 'client_form',
		})

		const existingOrder = await findExistingWorkOrder({
			leadId: leadId || null,
			phone: normalizedPhone,
			visitDateObj,
			visitTime: visitTime || null,
		})

		const data = {
			leadId: leadId || null,
			customerId: customer?.id || null,
			name: name.trim(),
			phone: normalizedPhone,
			service: service || null,
			regNumber: normalizeOptionalText(regNumber),
			color: normalizeOptionalText(color),
			carModel: normalizeOptionalText(carModel),
			address: normalizeOptionalText(address),
			lat: typeof lat === 'number' ? lat : null,
			lng: typeof lng === 'number' ? lng : null,
			notes: normalizeOptionalText(notes),
			visitDate: visitDateObj,
			visitTime: visitTime || null,
			wheelRimSize: normalizedWheelRimSize,
			tireSize: normalizeOptionalText(tireSize),
			wantsInvoice: !!wantsInvoice,
			invoiceNip: wantsInvoice ? normalizeOptionalText(invoiceNip) : null,
			invoiceEmail: wantsInvoice ? normalizeOptionalText(invoiceEmail) : null,
		}

		const workOrder = existingOrder
			? await db.workOrder.update({ where: { id: existingOrder.id }, data })
			: await db.workOrder.create({ data })

		try {
			if (workOrder.leadId) {
				await markSmsFormCompletedByLead(workOrder.leadId)
			} else if (workOrder.phone) {
				await markSmsFormCompletedByPhone(workOrder.phone, {
					visitDate,
					visitTime,
				})
			}
		} catch (error) {
			console.error('[order client sms complete]', error)
		}

		try {
			if (existingOrder && existingOrder.telegramMessageId) {
				await updateWorkOrderMessage(workOrder)
			} else {
				await sendWorkOrderToTelegram(workOrder, { visitDate, visitTime })
			}
		} catch (error) {
			console.error('[order client telegram]', error)
		}

		await updateScheduleMessage().catch(error =>
			console.error('[order client schedule]', error)
		)
		await updateIncompleteCompletionMessage().catch(error =>
			console.error('[order client incomplete tracker]', error)
		)

		return jsonCors({
			ok: true,
			mode: existingOrder ? 'updated' : 'created',
			order: workOrder,
		})
	} catch (error) {
		console.error('/api/public/order/client failed:', error)
		return jsonCors({ ok: false, error: 'Blad serwera' }, { status: 500 })
	}
}

export async function OPTIONS() {
	return optionsCors('POST, OPTIONS')
}
