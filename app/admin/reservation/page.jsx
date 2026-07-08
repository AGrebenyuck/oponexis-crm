import ReservationForm from '../_components/ReservationForm'
import { db } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function ReservationPage() {
	const services = await db.service.findMany({
		orderBy: { createdAt: 'asc' },
		include: { additionalServices: { orderBy: { createdAt: 'asc' } } },
	})

	return <ReservationForm initialServices={services} />
}
