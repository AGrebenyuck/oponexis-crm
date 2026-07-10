import { completionsToCsv } from '@/lib/completion-form-analytics'
import { getCompletionFormQuestionConfig } from '@/lib/completion-form-questions'
import { db } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
	const questionConfig = await getCompletionFormQuestionConfig({ activeOnly: true })
	const completions = await db.workOrderCompletion.findMany({
		orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
		include: { customAnswers: true },
	})
	const csv = completionsToCsv(
		completions,
		questionConfig.customQuestions
	)

	return new Response(`\uFEFF${csv}`, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="oponexis-work-order-completions.csv"',
		},
	})
}
