import { db } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		const result = await db.$queryRaw`SELECT 1 as ok`

		return NextResponse.json({
			success: true,
			db: result,
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
