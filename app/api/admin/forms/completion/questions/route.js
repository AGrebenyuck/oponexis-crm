import { NextResponse } from 'next/server'
import {
	completionFieldTypeValues,
	getCustomCompletionQuestions,
	normalizeQuestionOptions,
} from '@/lib/completion-form-questions'
import { db } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function slugify(value) {
	const base = String(value || 'pole')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ł/g, 'l')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 42)

	return `custom_${base || 'pole'}_${Date.now().toString(36)}`
}

function validatePayload(body) {
	const label = String(body.label || '').trim()
	const type = String(body.type || '').trim()

	if (!label) return { error: 'Podaj nazwę pytania.' }
	if (!completionFieldTypeValues.includes(type)) {
		return { error: 'Nieznany typ pytania.' }
	}

	const options = normalizeQuestionOptions(body.options)
	if (['single_choice', 'multiple_choice'].includes(type) && options.length < 1) {
		return { error: 'Dodaj przynajmniej jedną opcję odpowiedzi.' }
	}

	return {
		data: {
			label,
			type,
			required: Boolean(body.required),
			description: String(body.description || '').trim() || null,
			options,
		},
	}
}

export async function GET() {
	const questions = await getCustomCompletionQuestions({ activeOnly: false })
	return NextResponse.json({ ok: true, questions })
}

export async function POST(req) {
	try {
		const body = await req.json()
		const validated = validatePayload(body)
		if (validated.error) {
			return NextResponse.json({ ok: false, error: validated.error }, { status: 400 })
		}

		const last = await db.completionFormQuestion.findFirst({
			orderBy: { position: 'desc' },
			select: { position: true },
		})

		const question = await db.completionFormQuestion.create({
			data: {
				...validated.data,
				key: slugify(validated.data.label),
				position: (last?.position ?? -1) + 1,
				active: true,
			},
		})

		return NextResponse.json({ ok: true, question })
	} catch (error) {
		console.error('POST /api/admin/forms/completion/questions failed:', error)
		return NextResponse.json(
			{ ok: false, error: error.message || 'Nie udało się dodać pytania.' },
			{ status: 500 }
		)
	}
}

export async function PATCH(req) {
	try {
		const body = await req.json()

		if (Array.isArray(body.order)) {
			await Promise.all(
				body.order.map((id, position) =>
					db.completionFormQuestion.update({
						where: { id },
						data: { position },
					})
				)
			)
			const questions = await getCustomCompletionQuestions({ activeOnly: false })
			return NextResponse.json({ ok: true, questions })
		}

		const id = String(body.id || '')
		if (!id) {
			return NextResponse.json({ ok: false, error: 'Brak ID pytania.' }, { status: 400 })
		}

		const validated = validatePayload(body)
		if (validated.error) {
			return NextResponse.json({ ok: false, error: validated.error }, { status: 400 })
		}

		const question = await db.completionFormQuestion.update({
			where: { id },
			data: {
				...validated.data,
				active: body.active !== false,
			},
		})

		return NextResponse.json({ ok: true, question })
	} catch (error) {
		console.error('PATCH /api/admin/forms/completion/questions failed:', error)
		return NextResponse.json(
			{ ok: false, error: error.message || 'Nie udało się zapisać pytania.' },
			{ status: 500 }
		)
	}
}
