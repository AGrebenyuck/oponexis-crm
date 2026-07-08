import { handleTelegramUpdate } from '@/lib/telegram'
import { NextResponse } from 'next/server'

export async function GET(req) {
	return NextResponse.redirect(new URL('/admin', req.url))
}

export async function POST(req) {
	try {
		console.info('[telegram webhook] POST / received')
		const update = await req.json()
		await handleTelegramUpdate(update)

		return new NextResponse('OK', { status: 200 })
	} catch (error) {
		console.error('POST / telegram webhook failed:', {
			error: error?.message || String(error),
			stack: error?.stack || null,
		})
		return new NextResponse('ERROR', { status: 500 })
	}
}
