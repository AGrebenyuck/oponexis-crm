import { handleTelegramUpdate } from '@/lib/telegram'
import { NextResponse } from 'next/server'

export async function POST(req) {
	try {
		const update = await req.json()
		await handleTelegramUpdate(update)

		return new NextResponse('OK', { status: 200 })
	} catch (error) {
		console.error('/api/telegram/webhook failed:', error)
		return new NextResponse('ERROR', { status: 500 })
	}
}

export async function GET() {
	return new NextResponse('OK', { status: 200 })
}
