import crypto from 'crypto'
import { DateTime } from 'luxon'
import { looksLikeTestData, normalizedPhoneOrRaw, upsertCustomerFromContact } from './customer'
import { normalizeOptionalText, parseYmdToUtcDate } from './date'
import { db } from './prisma'

export const importFiles = {
	calls2: {
		label: 'Calls 2.csv',
		fileName: 'Calls 2.csv',
	},
	leads: {
		label: 'Lead.csv',
		fileName: 'Lead.csv',
	},
	workOrders: {
		label: 'WorkOrder.csv',
		fileName: 'WorkOrder.csv',
	},
}

export function parseCsv(text) {
	const rows = []
	let row = []
	let field = ''
	let quoted = false

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index]
		const next = text[index + 1]

		if (char === '"') {
			if (quoted && next === '"') {
				field += '"'
				index += 1
			} else {
				quoted = !quoted
			}
			continue
		}

		if (char === ',' && !quoted) {
			row.push(field)
			field = ''
			continue
		}

		if ((char === '\n' || char === '\r') && !quoted) {
			if (char === '\r' && next === '\n') index += 1
			row.push(field)
			if (row.some(value => String(value || '').trim())) rows.push(row)
			row = []
			field = ''
			continue
		}

		field += char
	}

	row.push(field)
	if (row.some(value => String(value || '').trim())) rows.push(row)
	if (!rows.length) return []

	const headers = rows[0].map((header, index) => {
		const trimmed = String(header || '').replace(/^\uFEFF/, '').trim()
		return trimmed || `__empty_${index}`
	})

	return rows.slice(1).map(values => {
		const item = {}
		headers.forEach((header, index) => {
			item[header] = values[index] == null ? '' : String(values[index]).trim()
		})
		return item
	})
}

export async function readWorkspaceCsv(type) {
	const config = importFiles[type]
	if (!config) throw new Error('Nieznany typ importu.')
	throw new Error(
		`Import z lokalnego pliku "${config.fileName}" jest wyłączony w wersji produkcyjnej. Wklej treść CSV ręcznie, jeśli import będzie jeszcze potrzebny.`
	)
}

function hashRow(type, row) {
	return crypto
		.createHash('sha256')
		.update(type)
		.update(JSON.stringify(row))
		.digest('hex')
}

function parseAmount(value) {
	if (String(value || '').trim() === '') return null
	const normalized = String(value || '')
		.replace(/\s/g, '')
		.replace(',', '.')
		.replace(/[^\d.-]/g, '')
	const amount = Number(normalized)
	return Number.isFinite(amount) ? amount : null
}

function parseDate(value) {
	if (!value) return null
	const raw = String(value).trim()
	const formats = ['yyyy-MM-dd', 'yyyy/MM/dd h:mm:ss a ZZZZ', 'yyyy-MM-dd HH:mm:ss.SSS']
	for (const format of formats) {
		const dt = DateTime.fromFormat(raw, format, { zone: 'Europe/Warsaw' })
		if (dt.isValid) return dt.toJSDate()
	}
	const iso = DateTime.fromISO(raw, { zone: 'Europe/Warsaw' })
	return iso.isValid ? iso.toJSDate() : null
}

function parseJsonArray(value) {
	if (!value) return []
	try {
		const parsed = JSON.parse(value)
		return Array.isArray(parsed) ? parsed.map(String) : []
	} catch {
		return []
	}
}

function truthyTak(value) {
	const normalized = String(value || '').trim().toLowerCase()
	if (!normalized) return null
	if (['tak', 'yes', 'true', '1'].includes(normalized)) return true
	if (['nie', 'no', 'false', '0'].includes(normalized)) return false
	return null
}

function normalizeCallsRow(row) {
	const phone = normalizedPhoneOrRaw(row['Telefon'])
	const serviceNames = String(row['Usługa ?'] || '')
		.split(',')
		.map(item => item.trim())
		.filter(Boolean)

	const name = normalizeOptionalText(row['Imię'])
	const isTest = looksLikeTestData(
		name,
		phone,
		row['Samochód'],
		row['Usługa ?'],
		row['Kwota do zaplaty']
	)

	return {
		name,
		phone,
		gender: normalizeOptionalText(row['Płeć']),
		source: normalizeOptionalText(row['Zródło']),
		car: normalizeOptionalText(row['Samochód']),
		serviceUsed: truthyTak(row['Skorzystał z usługi']),
		completedAt: parseDate(row['Data']),
		formSubmittedAt: parseDate(row['Отметка времени']),
		serviceNames,
		amount: parseAmount(row['Kwota do zaplaty']),
		invoiceIssued: truthyTak(row['Давав чек або фактуру ?']),
		paymentMethod: normalizeOptionalText(row['Płatność karta/gotuwka']),
		isTest,
		rawData: row,
	}
}

function normalizeLeadRow(row) {
	const phone = normalizedPhoneOrRaw(row.phone)
	const isTest = looksLikeTestData(row.name, phone, row.serviceName, row.id)
	return {
		id: row.id,
		createdAt: parseDate(row.createdAt) || new Date(),
		name: normalizeOptionalText(row.name) || 'Brak imienia',
		phone,
		serviceId: normalizeOptionalText(row.serviceId) || 'unknown',
		serviceName: normalizeOptionalText(row.serviceName),
		selectedIds: parseJsonArray(row.selectedIds),
		selectedNames: parseJsonArray(row.selectedNames),
		partnerCode: normalizeOptionalText(row.partnerCode),
		ua: normalizeOptionalText(row.ua),
		ip: normalizeOptionalText(row.ip),
		status: normalizeOptionalText(row.status) || 'new',
		monthKey: normalizeOptionalText(row.monthKey),
		isTest,
	}
}

function normalizeWorkOrderRow(row) {
	const id = Number(row.id)
	const phone = normalizedPhoneOrRaw(row.phone)
	const visitDate = parseDate(row.visitDate)
	const isTest = looksLikeTestData(
		row.name,
		phone,
		row.service,
		row.carModel,
		row.address,
		row.regNumber
	)

	return {
		id: Number.isFinite(id) ? id : null,
		createdAt: parseDate(row.createdAt) || new Date(),
		updatedAt: parseDate(row.updatedAt) || new Date(),
		leadId: normalizeOptionalText(row.leadId),
		name: normalizeOptionalText(row.name) || 'Brak imienia',
		phone,
		service: normalizeOptionalText(row.service),
		regNumber: normalizeOptionalText(row.regNumber),
		color: normalizeOptionalText(row.color),
		carModel: normalizeOptionalText(row.carModel),
		address: normalizeOptionalText(row.address),
		lat: row.lat ? Number(row.lat) : null,
		lng: row.lng ? Number(row.lng) : null,
		notes: normalizeOptionalText(row.notes),
		telegramMessageId: row.telegramMessageId ? Number(row.telegramMessageId) : null,
		visitDate,
		visitTime: normalizeOptionalText(row.visitTime),
		invoiceEmail: normalizeOptionalText(row.invoiceEmail),
		invoiceNip: normalizeOptionalText(row.invoiceNip),
		wantsInvoice: String(row.wantsInvoice || '').toLowerCase() === 'true',
		tireSize: normalizeOptionalText(row.tireSize),
		wheelRimSize: normalizeOptionalText(row.wheelRimSize),
		isTest,
	}
}

async function findMatchingWorkOrder({ phone, completedAt, serviceNames }) {
	if (!phone || !completedAt) return null
	const start = DateTime.fromJSDate(completedAt).startOf('day').toJSDate()
	const end = DateTime.fromJSDate(completedAt).endOf('day').toJSDate()
	const orders = await db.workOrder.findMany({
		where: {
			phone,
			OR: [{ visitDate: { gte: start, lte: end } }, { visitDate: null }],
		},
		orderBy: [{ visitDate: 'desc' }, { id: 'desc' }],
		take: 10,
	})
	if (!orders.length) return null

	const services = (serviceNames || []).join(' ').toLowerCase()
	return (
		orders.find(order =>
			services && order.service
				? services.includes(order.service.toLowerCase()) ||
				  order.service.toLowerCase().includes(services)
				: false
		) || orders[0]
	)
}

function summarizeRows(type, rows) {
	const normalized = rows.map(row => {
		if (type === 'calls2') return normalizeCallsRow(row)
		if (type === 'leads') return normalizeLeadRow(row)
		return normalizeWorkOrderRow(row)
	})

	return {
		totalRows: rows.length,
		validPhoneRows: normalized.filter(row => row.phone).length,
		testRows: normalized.filter(row => row.isTest).length,
		emptyPhoneRows: normalized.filter(row => !row.phone).length,
		amountRows:
			type === 'calls2' ? normalized.filter(row => row.amount != null).length : null,
		sample: normalized.slice(0, 5),
	}
}

export async function previewImport(type, text) {
	const rows = parseCsv(text)
	return {
		type,
		...summarizeRows(type, rows),
	}
}

async function importCalls(rows, { includeTests }) {
	const result = {
		imported: 0,
		skippedTests: 0,
		skippedInvalid: 0,
		duplicates: 0,
		matchedWorkOrders: 0,
		customersTouched: 0,
	}

	for (const row of rows) {
		const data = normalizeCallsRow(row)
		if (!data.phone) {
			result.skippedInvalid += 1
			continue
		}
		if (data.isTest && !includeTests) {
			result.skippedTests += 1
			continue
		}

		const importRowHash = hashRow('calls2', row)
		const existing = await db.workOrderCompletion.findUnique({
			where: { importRowHash },
		})
		if (existing) {
			result.duplicates += 1
			continue
		}

		const customer = await upsertCustomerFromContact(data)
		if (customer) result.customersTouched += 1

		const matched = await findMatchingWorkOrder(data)
		if (matched) result.matchedWorkOrders += 1

		await db.workOrderCompletion.create({
			data: {
				customerId: customer?.id || null,
				workOrderId: matched?.id || null,
				formSubmittedAt: data.formSubmittedAt,
				completedAt: data.completedAt,
				name: data.name,
				phone: data.phone,
				gender: data.gender,
				source: data.source,
				car: data.car,
				serviceUsed: data.serviceUsed,
				serviceNames: data.serviceNames,
				amount: data.amount,
				invoiceIssued: data.invoiceIssued,
				paymentMethod: data.paymentMethod,
				importSource: 'google_forms_csv',
				importRowHash,
				isTest: data.isTest,
				rawData: data.rawData,
			},
		})

		if (matched && data.serviceUsed === true) {
			await db.workOrder.update({
				where: { id: matched.id },
				data: { status: 'completed', customerId: customer?.id || matched.customerId },
			})
		}

		result.imported += 1
	}

	return result
}

async function importLeads(rows, { includeTests }) {
	const result = {
		imported: 0,
		updated: 0,
		skippedTests: 0,
		skippedInvalid: 0,
		customersTouched: 0,
	}

	for (const row of rows) {
		const data = normalizeLeadRow(row)
		if (!data.id || !data.phone) {
			result.skippedInvalid += 1
			continue
		}
		if (data.isTest && !includeTests) {
			result.skippedTests += 1
			continue
		}
		const customer = await upsertCustomerFromContact(data)
		if (customer) result.customersTouched += 1

		const payload = {
			createdAt: data.createdAt,
			name: data.name,
			phone: data.phone,
			serviceId: data.serviceId,
			serviceName: data.serviceName,
			selectedIds: data.selectedIds,
			selectedNames: data.selectedNames,
			partnerCode: data.partnerCode,
			ua: data.ua,
			ip: data.ip,
			status: data.status,
			monthKey: data.monthKey,
			customerId: customer?.id || null,
		}

		const existing = await db.lead.findUnique({ where: { id: data.id } })
		if (existing) {
			await db.lead.update({ where: { id: data.id }, data: payload })
			result.updated += 1
		} else {
			await db.lead.create({ data: { id: data.id, ...payload } })
			result.imported += 1
		}
	}

	return result
}

async function importWorkOrders(rows, { includeTests }) {
	const result = {
		imported: 0,
		updated: 0,
		skippedTests: 0,
		skippedInvalid: 0,
		customersTouched: 0,
	}

	for (const row of rows) {
		const data = normalizeWorkOrderRow(row)
		if (!data.id || !data.phone) {
			result.skippedInvalid += 1
			continue
		}
		if (data.isTest && !includeTests) {
			result.skippedTests += 1
			continue
		}
		const customer = await upsertCustomerFromContact(data)
		if (customer) result.customersTouched += 1

		const payload = {
			createdAt: data.createdAt,
			updatedAt: data.updatedAt,
			leadId: data.leadId,
			customerId: customer?.id || null,
			name: data.name,
			phone: data.phone,
			service: data.service,
			status: data.visitDate ? 'scheduled' : 'new',
			regNumber: data.regNumber,
			color: data.color,
			carModel: data.carModel,
			address: data.address,
			lat: Number.isFinite(data.lat) ? data.lat : null,
			lng: Number.isFinite(data.lng) ? data.lng : null,
			notes: data.notes,
			telegramMessageId: Number.isFinite(data.telegramMessageId)
				? data.telegramMessageId
				: null,
			visitDate: data.visitDate ? parseYmdToUtcDate(DateTime.fromJSDate(data.visitDate).toISODate()) : null,
			visitTime: data.visitTime,
			invoiceEmail: data.invoiceEmail,
			invoiceNip: data.invoiceNip,
			wantsInvoice: data.wantsInvoice,
			tireSize: data.tireSize,
			wheelRimSize: data.wheelRimSize,
		}

		const existing = await db.workOrder.findUnique({ where: { id: data.id } })
		if (existing) {
			await db.workOrder.update({ where: { id: data.id }, data: payload })
			result.updated += 1
		} else {
			await db.workOrder.create({ data: { id: data.id, ...payload } })
			result.imported += 1
		}
	}

	return result
}

export async function runImport(type, text, options = {}) {
	const rows = parseCsv(text)
	if (type === 'calls2') return importCalls(rows, options)
	if (type === 'leads') return importLeads(rows, options)
	if (type === 'workOrders') return importWorkOrders(rows, options)
	throw new Error('Nieznany typ importu.')
}
