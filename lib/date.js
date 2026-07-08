export function parseYmdToUtcDate(value) {
	if (!value) return null
	const [year, month, day] = String(value).split('-').map(Number)
	if (!year || !month || !day) return null
	return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
}

export function normalizePhone(raw) {
	if (!raw) return null
	const trimmed = String(raw).trim()
	const hasPlus = trimmed.startsWith('+')
	const digits = trimmed.replace(/[^\d]/g, '')
	if (!digits) return null

	if (hasPlus) return `+${digits}`
	if (digits.length === 9) return `+48${digits}`
	return `+${digits}`
}

export function normalizeOptionalText(value) {
	const trimmed = String(value || '').trim()
	return trimmed ? trimmed : null
}
