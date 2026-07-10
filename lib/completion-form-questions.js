import { db } from './prisma'
import { baseCompletionQuestions } from './completion-form-analytics'

export const completionFieldTypes = [
	{ value: 'short_text', label: 'Krótka odpowiedź' },
	{ value: 'long_text', label: 'Długa odpowiedź' },
	{ value: 'phone', label: 'Telefon' },
	{ value: 'number', label: 'Liczba' },
	{ value: 'date', label: 'Data' },
	{ value: 'single_choice', label: 'Jedna odpowiedź' },
	{ value: 'multiple_choice', label: 'Wiele odpowiedzi' },
]

export const completionFieldTypeValues = completionFieldTypes.map(type => type.value)

export const editableSystemOptionKeys = ['gender', 'source', 'serviceUsed', 'serviceNames', 'invoiceIssued', 'paymentMethod']

export function normalizeQuestionOptions(value) {
	if (Array.isArray(value)) {
		return value.map(option => String(option || '').trim()).filter(Boolean)
	}

	return String(value || '')
		.split('\n')
		.map(option => option.trim())
		.filter(Boolean)
}

export function questionOptionsText(question) {
	const options = Array.isArray(question.options) ? question.options : []
	return options.join('\n')
}

export function serializeCustomQuestion(question) {
	return {
		id: question.id,
		key: question.key,
		label: question.label,
		type: question.type,
		required: Boolean(question.required),
		options: Array.isArray(question.options) ? question.options : [],
		position: question.position,
		active: Boolean(question.active),
		description: question.description || '',
		custom: true,
	}
}

export async function getCustomCompletionQuestions({ activeOnly = true } = {}) {
	const questions = await db.completionFormQuestion.findMany({
		where: activeOnly ? { active: true } : undefined,
		orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
	})

	return questions.map(serializeCustomQuestion)
}

export async function getSystemCompletionOptionSets() {
	const rows = await db.completionFormOptionSet.findMany()
	return Object.fromEntries(
		rows.map(row => [
			row.key,
			Array.isArray(row.options) ? row.options.map(String).filter(Boolean) : [],
		])
	)
}

export function buildCompletionQuestions(systemOptions = {}, customQuestions = []) {
	const systemQuestions = baseCompletionQuestions.map(question => ({
		...question,
		options: systemOptions[question.key]?.length
			? systemOptions[question.key]
			: question.options,
		system: true,
		editableOptions: editableSystemOptionKeys.includes(question.key),
	}))

	return [...systemQuestions, ...customQuestions]
}

export async function getCompletionFormQuestionConfig({ activeOnly = true } = {}) {
	const [systemOptions, customQuestions] = await Promise.all([
		getSystemCompletionOptionSets(),
		getCustomCompletionQuestions({ activeOnly }),
	])

	return {
		systemOptions,
		customQuestions,
		questions: buildCompletionQuestions(systemOptions, customQuestions),
	}
}

export function normalizeCustomAnswerValue(question, formData) {
	const name = `custom_${question.id}`

	if (question.type === 'multiple_choice') {
		return formData.getAll(name).map(String).map(item => item.trim()).filter(Boolean)
	}

	const raw = String(formData.get(name) || '').trim()
	if (!raw) return ''
	if (question.type === 'number') {
		const number = Number(raw.replace(',', '.'))
		return Number.isFinite(number) ? number : raw
	}
	return raw
}

export function customAnswerText(value) {
	if (Array.isArray(value)) return value.join(', ')
	if (value == null) return ''
	return String(value)
}

export async function saveCustomCompletionAnswers(completionId, questions, answers) {
	await Promise.all(
		questions.map(question => {
			const value = answers[question.id]
			return db.completionFormAnswer.upsert({
				where: {
					completionId_questionId: {
						completionId,
						questionId: question.id,
					},
				},
				update: {
					value,
					valueText: customAnswerText(value),
				},
				create: {
					completionId,
					questionId: question.id,
					value,
					valueText: customAnswerText(value),
				},
			})
		})
	)
}
