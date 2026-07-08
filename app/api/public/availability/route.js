import { db } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		const calendar = await db.calendar.findFirst({
			include: {
				days: true,
			},
		})

		return NextResponse.json({
			success: true,
			data: calendar,
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error.message,
			},
			{ status: 500 }
		)
	}
}
