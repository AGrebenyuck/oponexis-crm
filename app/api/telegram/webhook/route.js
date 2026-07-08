import { handleTelegramUpdate } from '@/lib/telegram'
import { NextResponse } from 'next/server'

function webhookStatus() {
	return {
		ok: true,
		endpoint: '/api/telegram/webhook',
		botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
		leadsChatConfigured: Boolean(process.env.TELEGRAM_CHAT_ID),
		workChatConfigured: Boolean(process.env.TELEGRAM_WORK_CHAT_ID),
		adminsConfigured: [
			process.env.TELEGRAM_ADMIN_1,
			process.env.TELEGRAM_ADMIN_2,
		].filter(Boolean).length,
	}
}

export async function POST(req) {
	try {
		console.info('[telegram webhook] POST /api/telegram/webhook received')
		const update = await req.json()
		await handleTelegramUpdate(update)

		return new NextResponse('OK', { status: 200 })
	} catch (error) {
		console.error('/api/telegram/webhook failed:', {
			error: error?.message || String(error),
			stack: error?.stack || null,
		})
		return new NextResponse('ERROR', { status: 500 })
	}
}

export async function GET() {
	return NextResponse.json(webhookStatus())
}
