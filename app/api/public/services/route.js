import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'
import { corsHeaders } from '@/lib/cors'

export async function GET() {
	try {
		const services = await db.service.findMany({
			orderBy: {
				createdAt: 'asc',
			},
			include: {
				additionalServices: {
					orderBy: {
						createdAt: 'asc',
					},
				},
			},
		})

		return NextResponse.json(
			{
				success: true,
				data: services,
				prices: services,
			},
			{
				headers: corsHeaders('GET, OPTIONS'),
			}
		)
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error.message,
			},
			{
				status: 500,
				headers: corsHeaders('GET, OPTIONS'),
			}
		)
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: corsHeaders('GET, OPTIONS'),
	})
}
