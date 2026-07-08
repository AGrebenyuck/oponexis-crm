import { realWorkOrderWhere } from './test-data'

export function incompleteCompletionWhere(untilDate) {
	return realWorkOrderWhere({
		visitDate: { lte: untilDate },
		completions: { none: { serviceUsed: { not: false } } },
	})
}

export function scheduledWorkOrderWhere(todayDate) {
	return realWorkOrderWhere({
		visitDate: { gte: todayDate },
		visitTime: { not: null },
	})
}
