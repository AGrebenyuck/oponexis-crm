import { updateScheduleMessage } from '@/lib/telegram'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		await updateScheduleMessage()
		return NextResponse.json({ ok: true })
	} catch (error) {
		console.error('GET /api/dev/refresh-schedule failed:', error)
		return NextResponse.json(
			{ ok: false, error: 'Server error' },
			{ status: 500 }
		)
	}
}
