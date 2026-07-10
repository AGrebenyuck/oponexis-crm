import { NextResponse } from 'next/server'
import {
	editableSystemOptionKeys,
	normalizeQuestionOptions,
} from '@/lib/completion-form-questions'
import { db } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req) {
	try {
		const body = await req.json()
		const key = String(body.key || '').trim()
		if (!editableSystemOptionKeys.includes(key)) {
			return NextResponse.json(
				{ ok: false, error: 'Tego pola systemowego nie można edytować.' },
				{ status: 400 }
			)
		}

		const options = normalizeQuestionOptions(body.options)
		if (!options.length) {
			return NextResponse.json(
				{ ok: false, error: 'Dodaj przynajmniej jedną opcję.' },
				{ status: 400 }
			)
		}

		const optionSet = await db.completionFormOptionSet.upsert({
			where: { key },
			update: { options },
			create: { key, options },
		})

		return NextResponse.json({ ok: true, optionSet })
	} catch (error) {
		console.error('PATCH /api/admin/forms/completion/system-options failed:', error)
		return NextResponse.json(
			{ ok: false, error: error.message || 'Nie udało się zapisać opcji.' },
			{ status: 500 }
		)
	}
}
