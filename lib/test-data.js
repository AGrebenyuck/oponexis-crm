const TEST_PATTERNS = [
	'test',
	'demo',
	'jan demo',
	'admin',
	'+481234',
	'123456789',
	'999999999',
	'888888888',
]

export function looksLikeTestRecord(...values) {
	const text = values
		.flat()
		.filter(value => value != null)
		.map(value => String(value).toLowerCase())
		.join(' ')

	return TEST_PATTERNS.some(pattern => text.includes(pattern))
}

export function realWorkOrderWhere(extra = {}) {
	return {
		status: { notIn: ['cancelled', 'deleted', 'test'] },
		...extra,
	}
}

export function realReservationWhere(extra = {}) {
	return extra
}
