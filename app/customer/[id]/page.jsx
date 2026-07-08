import { notFound } from 'next/navigation'
import {
	buildCustomerTimeline,
	formatDate,
	formatMoney,
	totalSpent,
} from '@/lib/customer-profile'
import { db } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function PublicCustomerPage({ params }) {
	const { id } = await params
	const customer = await db.customer.findUnique({
		where: { id },
		include: {
			leads: { orderBy: { createdAt: 'desc' }, take: 40 },
			workOrders: { orderBy: { createdAt: 'desc' }, take: 60 },
			completions: {
				where: { isTest: false, serviceUsed: { not: false } },
				orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
			},
			_count: { select: { leads: true, workOrders: true, completions: true } },
		},
	})

	if (!customer) notFound()

	const total = totalSpent(customer.completions)
	const timeline = buildCustomerTimeline(customer)

	return (
		<main className='opx-public-page'>
			<style>{`
				body { margin: 0; background: #132c43; font-family: Arial, Helvetica, sans-serif; }
				.opx-public-page { min-height: 100vh; padding: 18px; color: #132c43; box-sizing: border-box; }
				.opx-wrap { max-width: 760px; margin: 0 auto; }
				.opx-title { color: white; margin: 0 0 4px; font-size: 28px; }
				.opx-sub { color: #d7e4ef; margin: 0 0 18px; }
				.opx-card { background: white; border: 1px solid #d9e4ee; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 18px 48px rgba(6,20,34,.12); }
				.opx-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
				.opx-stat { background: #f4f8fb; border-radius: 8px; padding: 12px; }
				.opx-label { color: #5f7487; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px; }
				.opx-value { font-size: 22px; font-weight: 900; margin: 0; }
				.opx-profile { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin-top: 12px; }
				.opx-info { background: #f4f8fb; border-radius: 8px; padding: 10px 12px; }
				.opx-history { border: 1px solid #d9e4ee; border-radius: 8px; padding: 12px; margin-top: 10px; }
				.opx-history-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
				.opx-chip { display: inline-flex; border-radius: 999px; background: #fff4ec; color: #b94700; padding: 4px 8px; font-size: 11px; font-weight: 900; }
				.opx-history strong { display: block; }
				.opx-muted { color: #5f7487; font-size: 13px; }
				.opx-list { margin: 8px 0 0; padding-left: 16px; }
				.opx-list li { margin: 2px 0; }
				@media (max-width: 560px) { .opx-grid, .opx-profile { grid-template-columns: 1fr; } .opx-title { font-size: 24px; } }
			`}</style>
			<div className='opx-wrap'>
				<h1 className='opx-title'>{customer.name || 'Klient'}</h1>
				<p className='opx-sub'>{customer.phone}</p>

				<section className='opx-card'>
					<div className='opx-grid'>
						<Stat label='Wykonane' value={customer.completions.length} />
						<Stat label='LTV' value={formatMoney(total)} />
						<Stat label='Zlecenia' value={customer._count.workOrders} />
						<Stat label='Leady' value={customer._count.leads} />
					</div>
					<div className='opx-profile'>
						<Info label='Telefon' value={customer.phone} />
						<Info label='Źródło klienta' value={customer.source || '-'} />
						<Info label='Płeć' value={customer.gender || '-'} />
						<Info label='Utworzony' value={formatDate(customer.createdAt)} />
					</div>
				</section>

				<section className='opx-card'>
					<h2>Pełna historia klienta</h2>
					{timeline.length ? (
						timeline.map(item => <TimelineCard key={item.id} item={item} />)
					) : (
						<p className='opx-muted'>Brak historii klienta.</p>
					)}
				</section>

				<section className='opx-card'>
					<h2>Wykonane usługi</h2>
					{customer.completions.length ? (
						customer.completions.map(item => (
							<div key={item.id} className='opx-history'>
								<div className='opx-history-head'>
									<div>
										<strong>{item.serviceNames?.join(', ') || 'Usługa'}</strong>
										<span className='opx-muted'>
											{formatDate(item.completedAt)} · {formatMoney(item.amount)}
										</span>
									</div>
									<span className='opx-chip'>wykonane</span>
								</div>
								{item.car ? <p className='opx-muted'>Auto: {item.car}</p> : null}
								{item.notes ? <p>{item.notes}</p> : null}
							</div>
						))
					) : (
						<p className='opx-muted'>Brak wykonanych zleceń.</p>
					)}
				</section>
			</div>
		</main>
	)
}

function TimelineCard({ item }) {
	return (
		<div className='opx-history'>
			<div className='opx-history-head'>
				<div>
					<span className='opx-muted'>{formatDate(item.at)}</span>
					<strong>{item.title}</strong>
				</div>
				<span className='opx-chip'>{item.status}</span>
			</div>
			<p>{item.primary}</p>
			{item.amount != null ? (
				<p className='opx-muted'>Kwota: {formatMoney(item.amount)}</p>
			) : null}
			{item.meta?.length ? (
				<ul className='opx-list opx-muted'>
					{item.meta.map(line => (
						<li key={line}>{line}</li>
					))}
				</ul>
			) : null}
			{item.details?.length ? (
				<ul className='opx-list opx-muted'>
					{item.details.map(line => (
						<li key={line}>{line}</li>
					))}
				</ul>
			) : null}
		</div>
	)
}

function Info({ label, value }) {
	return (
		<div className='opx-info'>
			<p className='opx-label'>{label}</p>
			<p className='opx-muted'>{value || '-'}</p>
		</div>
	)
}

function Stat({ label, value }) {
	return (
		<div className='opx-stat'>
			<p className='opx-label'>{label}</p>
			<p className='opx-value'>{value}</p>
		</div>
	)
}
