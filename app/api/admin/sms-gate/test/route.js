import { NextResponse } from 'next/server'
import { checkSmsGateConnection } from '@/lib/sms/smsGateClient'

export async function GET() {
	try {
		const data = await checkSmsGateConnection()
		return NextResponse.json({ success: true, data })
	} catch (error) {
		console.error('GET /api/admin/sms-gate/test failed:', error)
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Nie sprawdzono SMSGate.',
			},
			{ status: 500 }
		)
	}
}
