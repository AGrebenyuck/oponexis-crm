import { db } from '@/lib/prisma'
import { buildCompletionAnalytics } from '@/lib/completion-form-analytics'
import { getCompletionFormQuestionConfig } from '@/lib/completion-form-questions'
import CompletionFormsClient from './CompletionFormsClient'

export const dynamic = 'force-dynamic'

export default async function AdminFormsPage() {
	const questionConfig = await getCompletionFormQuestionConfig({ activeOnly: false })
	const completions = await db.workOrderCompletion.findMany({
		orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
		include: {
			customer: { select: { id: true, name: true, phone: true } },
			workOrder: { select: { id: true, status: true, service: true } },
			customAnswers: true,
		},
	})

	const activeQuestions = questionConfig.questions.filter(question => question.system || question.active)
	const analytics = buildCompletionAnalytics(completions, activeQuestions)

	return (
		<CompletionFormsClient
			analytics={analytics}
			customQuestions={questionConfig.customQuestions}
			systemQuestions={questionConfig.questions.filter(question => question.system)}
		/>
	)
}
