import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'
import { runSmsCampaign } from '@/lib/sms/smsCampaignRunner'
import { smsGateConfigured } from '@/lib/sms/smsGateClient'

export async function POST() {
	try {
		if (!smsGateConfigured()) {
			return NextResponse.json(
				{ success: false, error: 'Brak konfiguracji SMSGate w .env.' },
				{ status: 400 }
			)
		}

		const campaigns = await db.smsCampaign.findMany({
			where: {
				status: 'SCHEDULED',
				scheduledAt: { lte: new Date() },
			},
			orderBy: { scheduledAt: 'asc' },
			take: 3,
		})

		const results = []
		for (const campaign of campaigns) {
			try {
				const updated = await runSmsCampaign(campaign.id)
				results.push({ id: campaign.id, status: updated.status })
			} catch (error) {
				await db.smsCampaign.update({
					where: { id: campaign.id },
					data: { status: 'FAILED', finishedAt: new Date() },
				})
				results.push({
					id: campaign.id,
					status: 'FAILED',
					error: error.message || 'Nie uruchomiono kampanii.',
				})
			}
		}

		return NextResponse.json({ success: true, started: results.length, results })
	} catch (error) {
		console.error('POST /api/cron/sms-campaigns failed:', error)
		return NextResponse.json(
			{ success: false, error: error.message || 'Nie uruchomiono zaplanowanych kampanii.' },
			{ status: 500 }
		)
	}
}

export async function GET() {
	return POST()
}
