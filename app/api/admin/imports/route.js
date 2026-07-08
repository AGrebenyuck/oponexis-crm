import { NextResponse } from 'next/server'
import { previewImport, readWorkspaceCsv, runImport } from '@/lib/imports'

async function readTextFromRequest(body) {
	if (body?.source === 'workspace') {
		return readWorkspaceCsv(body.type)
	}

	if (typeof body?.csv === 'string') return body.csv

	throw new Error('Brak pliku CSV.')
}

export async function POST(req) {
	try {
		const body = await req.json()
		const type = body?.type
		const mode = body?.mode || 'preview'

		if (!['calls2', 'leads', 'workOrders'].includes(type)) {
			return NextResponse.json(
				{ success: false, error: 'Nieznany typ importu.' },
				{ status: 400 }
			)
		}

		const csvText = await readTextFromRequest(body)

		if (mode === 'preview') {
			const preview = await previewImport(type, csvText)
			return NextResponse.json({ success: true, preview })
		}

		if (mode === 'import') {
			const result = await runImport(type, csvText, {
				includeTests: !!body.includeTests,
			})
			return NextResponse.json({ success: true, result })
		}

		return NextResponse.json(
			{ success: false, error: 'Nieznany tryb importu.' },
			{ status: 400 }
		)
	} catch (error) {
		console.error('POST /api/admin/imports failed:', error)
		return NextResponse.json(
			{ success: false, error: error.message || 'Blad importu.' },
			{ status: 500 }
		)
	}
}
