import { NextResponse } from 'next/server'

function publicBaseUrl(req) {
	return (
		process.env.CRM_PUBLIC_URL ||
		process.env.NEXT_PUBLIC_CRM_API_URL ||
		new URL(req.url).origin
	)
}

export async function GET(req) {
	const baseUrl = publicBaseUrl(req).replace(/\/$/, '')

	return NextResponse.json({
		ok: true,
		recommendedWebhookUrl: `${baseUrl}/api/telegram/webhook`,
		rootWebhookFallbackUrl: `${baseUrl}/`,
		config: {
			botToken: process.env.TELEGRAM_BOT_TOKEN ? 'set' : 'missing',
			leadsChatId: process.env.TELEGRAM_CHAT_ID ? 'set' : 'missing',
			workChatId: process.env.TELEGRAM_WORK_CHAT_ID ? 'set' : 'missing',
			admins: [
				process.env.TELEGRAM_ADMIN_1,
				process.env.TELEGRAM_ADMIN_2,
			].filter(Boolean).length,
			crmPublicUrl: process.env.CRM_PUBLIC_URL ? 'set' : 'missing',
			siteUrl: process.env.NEXT_PUBLIC_SITE_URL ? 'set' : 'missing',
		},
	})
}
