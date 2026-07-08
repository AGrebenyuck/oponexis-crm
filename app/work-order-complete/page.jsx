import { db } from '@/lib/prisma'
import SubmitButton from './SubmitButton'

export const dynamic = 'force-dynamic'

const serviceOptions = [
	'Wymiana kół',
	'Wymiana opon',
	'Remont opony',
	'Przechowania kół',
	'Odpalenie auta',
	'Sprzedaż używanych opon',
	'Sprzedaż nowych opon',
	'Sprzedaż opony dojazdowej',
]

const sources = ['Google maps', 'Site', 'Business card', 'Search system', 'Other']

function dateInput(value) {
	if (!value) return new Date().toISOString().slice(0, 10)
	return new Date(value).toISOString().slice(0, 10)
}

export default async function PublicWorkOrderCompletionPage({ searchParams }) {
	const params = await searchParams
	const id = Number(params?.id)
	const saved = params?.saved === '1'
	const order = id
		? await db.workOrder.findUnique({
				where: { id },
				include: {
					customer: {
						include: { _count: { select: { completions: true, workOrders: true } } },
					},
					completions: { orderBy: { createdAt: 'desc' }, take: 1 },
				},
		  })
		: null

	if (!id || !order) {
		return (
			<PublicShell title='Nie znaleziono zlecenia'>
				<div className='opx-card'>
					<p>Link jest niepoprawny albo zlecenie nie istnieje.</p>
				</div>
			</PublicShell>
		)
	}

	const completion = order.completions?.[0] || null
	const selectedServices = completion?.serviceNames?.length
		? completion.serviceNames
		: String(order.service || '')
				.split(',')
				.map(item => item.trim())
				.filter(Boolean)
	const car =
		completion?.car ||
		[order.carModel, order.regNumber].filter(Boolean).join(' / ')

	return (
		<PublicShell
			title={`Zakończenie zlecenia #${order.id}`}
			subtitle={
				order.customer
					? `Historia klienta: ${order.customer._count.completions} wykonane, ${order.customer._count.workOrders} zlecenia`
					: 'Nowy lub nierozpoznany klient'
			}
		>
			{saved ? (
				<div className='opx-success'>Zapisano wykonanie zlecenia.</div>
			) : null}
			<form
				method='post'
				action={`/api/work-orders/${order.id}/completion?redirect=1`}
				className='opx-card'
			>
				<div className='opx-grid'>
					<Field label='Imię'>
						<input name='name' defaultValue={completion?.name || order.name || ''} />
					</Field>
					<Field label='Telefon' required>
						<input
							name='phone'
							required
							defaultValue={completion?.phone || order.phone || ''}
						/>
					</Field>
				</div>

				<div className='opx-grid'>
					<Field label='Płeć'>
						<select name='gender' defaultValue={completion?.gender || ''}>
							<option value=''>Nie wybrano</option>
							<option value='Mężczyzna'>Mężczyzna</option>
							<option value='Kobieta'>Kobieta</option>
						</select>
					</Field>
					<Field label='Źródło'>
						<select name='source' defaultValue={completion?.source || ''}>
							<option value=''>Nie wybrano</option>
							{sources.map(source => (
								<option key={source} value={source}>
									{source}
								</option>
							))}
						</select>
					</Field>
				</div>

				<Field label='Samochód'>
					<input name='car' defaultValue={car} />
				</Field>

				<div className='opx-grid'>
					<Field label='Skorzystał z usługi' required>
						<select
							name='serviceUsed'
							required
							defaultValue={
								completion?.serviceUsed == null
									? 'true'
									: completion.serviceUsed
									? 'true'
									: 'false'
							}
						>
							<option value='true'>Tak</option>
							<option value='false'>Nie</option>
						</select>
					</Field>
					<Field label='Data'>
						<input
							type='date'
							name='completedAt'
							defaultValue={dateInput(completion?.completedAt || order.visitDate)}
						/>
					</Field>
				</div>

				<Field label='Usługa' required>
					<div className='opx-checks'>
						{serviceOptions.map(service => (
							<label key={service} className='opx-check'>
								<input
									type='checkbox'
									name='serviceNames'
									value={service}
									defaultChecked={selectedServices.includes(service)}
								/>
								<span>{service}</span>
							</label>
						))}
					</div>
				</Field>

				<Field label='Kwota do zapłaty'>
					<input
						type='number'
						min='0'
						step='0.01'
						name='amount'
						defaultValue={completion?.amount ?? ''}
					/>
				</Field>

				<div className='opx-grid'>
					<Field label='Czek albo faktura'>
						<select
							name='invoiceIssued'
							defaultValue={
								completion?.invoiceIssued == null
									? ''
									: completion.invoiceIssued
									? 'true'
									: 'false'
							}
						>
							<option value=''>Nie wybrano</option>
							<option value='true'>Tak</option>
							<option value='false'>Nie</option>
						</select>
					</Field>
					<Field label='Płatność'>
						<select name='paymentMethod' defaultValue={completion?.paymentMethod || ''}>
							<option value=''>Nie wybrano</option>
							<option value='Karta'>Karta</option>
							<option value='Gotówka'>Gotówka</option>
						</select>
					</Field>
				</div>

				<Field label='Notatka'>
					<textarea name='notes' rows={3} defaultValue={completion?.notes || ''} />
				</Field>

				<SubmitButton />
			</form>
		</PublicShell>
	)
}

function PublicShell({ title, subtitle, children }) {
	return (
		<main className='opx-public-form'>
			<style>{`
				body { margin: 0; background: #132c43; font-family: Arial, Helvetica, sans-serif; }
				.opx-public-form { min-height: 100vh; padding: 18px; box-sizing: border-box; color: #132c43; }
				.opx-wrap { max-width: 760px; margin: 0 auto; }
				.opx-title { margin: 0 0 4px; color: white; font-size: 26px; }
				.opx-sub { margin: 0 0 18px; color: #d7e4ef; font-size: 14px; }
				.opx-card { background: white; border: 1px solid #d9e4ee; border-radius: 8px; padding: 16px; box-shadow: 0 18px 48px rgba(6,20,34,.12); }
				.opx-success { margin-bottom: 12px; border: 1px solid #a7f3d0; background: #ecfdf5; color: #047857; border-radius: 8px; padding: 11px 12px; font-weight: 800; }
				.opx-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
				label { display: block; margin-bottom: 14px; font-weight: 700; font-size: 14px; }
				input, select, textarea { width: 100%; box-sizing: border-box; margin-top: 7px; border: 1px solid #cbd8e4; border-radius: 8px; padding: 11px 12px; font: inherit; color: #132c43; }
				textarea { resize: vertical; }
				.opx-checks { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin-top: 7px; }
				.opx-check { display: flex; align-items: center; gap: 8px; margin: 0; border: 1px solid #d9e4ee; border-radius: 8px; padding: 10px; font-size: 13px; }
				.opx-check input { width: auto; margin: 0; }
				.opx-submit { width: 100%; border: 0; border-radius: 8px; background: #fd6d02; color: white; padding: 13px 16px; font-weight: 900; font-size: 16px; }
				.opx-submit:disabled { opacity: .72; cursor: wait; }
				@media (max-width: 620px) { .opx-grid, .opx-checks { grid-template-columns: 1fr; } .opx-title { font-size: 22px; } }
			`}</style>
			<div className='opx-wrap'>
				<h1 className='opx-title'>{title}</h1>
				{subtitle ? <p className='opx-sub'>{subtitle}</p> : null}
				{children}
			</div>
		</main>
	)
}

function Field({ label, required = false, children }) {
	return (
		<label>
			{label} {required ? <span style={{ color: '#dc2626' }}>*</span> : null}
			{children}
		</label>
	)
}
