const DEFAULT_BASE_URL = 'https://api.sms-gate.app'

function authHeader(username, password) {
	return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

function normalizeBaseUrl(value) {
	const baseUrl = (value || DEFAULT_BASE_URL).trim()
	if (/^https?:\/\//i.test(baseUrl)) return baseUrl
	return `https://${baseUrl}`
}

function errorMessage(prefix, status, json) {
	const details = json?.message || json?.error || json?.title
	return details ? `${prefix}: ${details}` : `${prefix}: SMSGate HTTP ${status}`
}

function extractMessageId(json, fallbackId) {
	return (
		json?.id ||
		json?.messageId ||
		json?.ids?.[0] ||
		json?.data?.id ||
		json?.data?.messageId ||
		json?.items?.[0]?.id ||
		fallbackId ||
		null
	)
}

function extractMessageState(json) {
	const state =
		json?.state ||
		json?.status ||
		json?.data?.state ||
		json?.data?.status ||
		json?.items?.[0]?.state ||
		json?.items?.[0]?.status ||
		''
	return String(state).toUpperCase()
}

function extractMessageReason(json) {
	return (
		json?.reason ||
		json?.error ||
		json?.message ||
		json?.data?.reason ||
		json?.data?.error ||
		json?.items?.[0]?.reason ||
		json?.items?.[0]?.error ||
		null
	)
}

export function smsGateConfigured() {
	return Boolean(process.env.SMSGATE_USERNAME && process.env.SMSGATE_PASSWORD)
}

function smsGateCredentials() {
	return {
		username: process.env.SMSGATE_USERNAME?.trim(),
		password: process.env.SMSGATE_PASSWORD?.trim(),
		baseUrl: normalizeBaseUrl(process.env.SMSGATE_BASE_URL),
		deviceId: process.env.SMSGATE_DEVICE_ID?.trim() || '',
		simNumber: Number(process.env.SMSGATE_SIM_NUMBER || 1),
		useDeviceId: process.env.SMSGATE_USE_DEVICE_ID === 'true',
	}
}

export async function sendSmsGateMessage({ phone, text, customId }) {
	const { username, password, baseUrl, deviceId, simNumber, useDeviceId } =
		smsGateCredentials()

	if (!username || !password) {
		throw new Error('Brak SMSGATE_USERNAME albo SMSGATE_PASSWORD w .env')
	}

	const url = new URL('/3rdparty/v1/messages', baseUrl)
	url.searchParams.set('skipPhoneValidation', 'true')
	url.searchParams.set('deviceActiveWithin', '12')

	const payload = {
		id: customId,
		textMessage: { text },
		phoneNumbers: [phone],
	}
	if (useDeviceId && deviceId) payload.deviceId = deviceId
	if (useDeviceId && Number.isFinite(simNumber)) payload.simNumber = simNumber

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: authHeader(username, password),
		},
		body: JSON.stringify(payload),
		cache: 'no-store',
	})

	const json = await res.json().catch(() => null)
	if (!res.ok) {
		throw new Error(errorMessage('Nie wysłano SMS', res.status, json))
	}

	return {
		raw: json,
		id: extractMessageId(json, customId),
	}
}

export async function getSmsGateMessageStatus(messageId) {
	const { username, password, baseUrl } = smsGateCredentials()

	if (!username || !password) {
		throw new Error('Brak SMSGATE_USERNAME albo SMSGATE_PASSWORD w .env')
	}
	if (!messageId) {
		throw new Error('Brak ID wiadomości SMSGate.')
	}

	const url = new URL(`/3rdparty/v1/messages/${messageId}`, baseUrl)
	const res = await fetch(url, {
		headers: {
			Authorization: authHeader(username, password),
		},
		cache: 'no-store',
	})
	const json = await res.json().catch(() => null)
	if (!res.ok) {
		throw new Error(errorMessage('Nie pobrano statusu SMS', res.status, json))
	}

	return {
		raw: json,
		state: extractMessageState(json),
		reason: extractMessageReason(json),
	}
}

export async function checkSmsGateConnection() {
	const { username, password, baseUrl, deviceId, simNumber, useDeviceId } =
		smsGateCredentials()

	if (!username || !password) {
		throw new Error('Brak SMSGATE_USERNAME albo SMSGATE_PASSWORD w .env')
	}

	const messagesUrl = new URL('/3rdparty/v1/messages', baseUrl)
	const res = await fetch(messagesUrl, {
		headers: {
			Authorization: authHeader(username, password),
		},
		cache: 'no-store',
	})
	const json = await res.json().catch(() => null)

	if (!res.ok) {
		throw new Error(errorMessage('Autoryzacja SMSGate nie przeszła', res.status, json))
	}

	const messages = Array.isArray(json) ? json : json?.data || json?.items || []
	return {
		baseUrl,
		usernameLength: username.length,
		passwordLength: password.length,
		deviceIdConfigured: Boolean(deviceId),
		deviceIdUsed: Boolean(useDeviceId && deviceId),
		simNumber,
		messagesCount: Array.isArray(messages) ? messages.length : null,
	}
}
