export const CONTACT_STATUSES = [
	'NOT_CONTACTED',
	'SMS_SENT',
	'CALLED',
	'NO_ANSWER',
	'INTERESTED',
	'BOOKED',
	'DECLINED',
	'CALL_BACK',
]

export const SEASONS = ['spring', 'summer', 'autumn', 'winter']

export function seasonFromDate(date) {
	const month = new Date(date).getMonth() + 1
	if ([3, 4, 5].includes(month)) return 'spring'
	if ([6, 7, 8].includes(month)) return 'summer'
	if ([9, 10, 11].includes(month)) return 'autumn'
	return 'winter'
}

export function seasonYearFromDate(date) {
	const parsed = new Date(date)
	const season = seasonFromDate(parsed)
	const year = parsed.getFullYear()
	const month = parsed.getMonth() + 1

	if (season === 'winter' && [1, 2].includes(month)) return year - 1
	return year
}

export function seasonLabel(season) {
	return (
		{
			spring: 'Wiosna',
			summer: 'Lato',
			autumn: 'Jesień',
			winter: 'Zima',
		}[season] || season
	)
}

export function seasonPeriodLabel(season, year) {
	if (season === 'winter') {
		const start = Number(year)
		const end = String((start + 1) % 100).padStart(2, '0')
		return `${seasonLabel(season)} ${start}/${end}`
	}

	return `${seasonLabel(season)} ${year}`
}

export function currentSeason(now = new Date()) {
	return seasonFromDate(now)
}

export function isStorageService(names = []) {
	return names.some(name => {
		const normalized = String(name || '').toLowerCase()
		return (
			normalized.includes('przechow') ||
			normalized.includes('magazyn') ||
			normalized.includes('storage')
		)
	})
}

export function completionMatchesSeason(completion, season, year) {
	if (!completion.completedAt) return false
	const date = new Date(completion.completedAt)
	return seasonYearFromDate(date) === Number(year) && seasonFromDate(date) === season
}

export function previousSeason({ season, year }) {
	const index = SEASONS.indexOf(season)
	if (index <= 0) return { season: 'winter', year: Number(year) - 1 }
	return { season: SEASONS[index - 1], year: Number(year) }
}
