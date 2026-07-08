import {
	updateIncompleteCompletionMessage,
	updateScheduleMessage,
	updateSmsTrackerMessage,
} from '@/lib/telegram'
import { NextResponse } from 'next/server'

export async function GET() {
	const tasks = [
		['schedule', updateScheduleMessage],
		['sms_forms', updateSmsTrackerMessage],
		['incomplete_completions', updateIncompleteCompletionMessage],
	]

	const results = {}

	for (const [name, task] of tasks) {
		try {
			const result = await task()
			results[name] = {
				ok: true,
				messageId: result?.message_id || null,
			}
		} catch (error) {
			console.error(`[dev refresh] ${name} failed:`, {
				error: error?.message || String(error),
				stack: error?.stack || null,
			})
			results[name] = {
				ok: false,
				error: error?.message || 'Server error',
			}
		}
	}

	const ok = Object.values(results).every(item => item.ok)
	return NextResponse.json({ ok, results }, { status: ok ? 200 : 207 })
}
