import { realWorkOrderWhere } from './test-data'

export function incompleteCompletionWhere(todayDate) {
	return realWorkOrderWhere({
		visitDate: { lte: todayDate },
		completions: { none: { serviceUsed: { not: false } } },
	})
}
