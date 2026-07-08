'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import messageToast from '../_components/message'
import Button from '../_components/ui/Button'
import Spin from '../_components/ui/Spin'

const PAGE_SIZE = 16

const seasonOptions = [
	{ value: 'spring', label: 'Wiosna' },
	{ value: 'summer', label: 'Lato' },
	{ value: 'autumn', label: 'Jesień' },
	{ value: 'winter', label: 'Zima' },
]

const scopeLabels = {
	season: 'Klienci w wybranym sezonie',
	previous_no_repeat: 'Do odzyskania z poprzedniego sezonu',
	all: 'Cała baza klientów',
}

const statusLabels = {
	NOT_CONTACTED: 'Do kontaktu',
	SMS_SENT: 'SMS wysłany',
	CALLED: 'Zadzwoniono',
	NO_ANSWER: 'Nie odebrał',
	INTERESTED: 'Zainteresowany',
	BOOKED: 'Umówiony',
	DECLINED: 'Odmowa',
	CALL_BACK: 'Oddzwonić',
}

function currentSeason() {
	const month = new Date().getMonth() + 1
	if ([3, 4, 5].includes(month)) return 'spring'
	if ([6, 7, 8].includes(month)) return 'summer'
	if ([9, 10, 11].includes(month)) return 'autumn'
	return 'winter'
}

function formatMoney(value) {
	return `${Math.round(Number(value || 0)).toLocaleString('pl-PL')} zł`
}

function formatDate(value) {
	if (!value) return '-'
	return new Intl.DateTimeFormat('pl-PL', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(new Date(value))
}

function seasonName(season) {
	return seasonOptions.find(item => item.value === season)?.label || season
}

function seasonPeriodLabel(season, year) {
	if (season === 'winter') {
		const end = String((Number(year) + 1) % 100).padStart(2, '0')
		return `${seasonName(season)} ${year}/${end}`
	}
	return `${seasonName(season)} ${year}`
}

export default function SeasonPage() {
	const router = useRouter()
	const [filters, setFilters] = useState({
		seasons: [currentSeason()],
		year: String(new Date().getFullYear()),
		scope: 'season',
		status: '',
		source: '',
		repeat: '',
		storage: '',
		search: '',
	})
	const [data, setData] = useState(null)
	const [loading, setLoading] = useState(true)
	const [savingId, setSavingId] = useState('')
	const [page, setPage] = useState(1)
	const [selectedCustomer, setSelectedCustomer] = useState(null)
	const [selectedSeason, setSelectedSeason] = useState(null)
	const [seasonMenuOpen, setSeasonMenuOpen] = useState(false)
	const [campaignOpen, setCampaignOpen] = useState(false)
	const [creatingCampaign, setCreatingCampaign] = useState(false)
	const [campaignForm, setCampaignForm] = useState({
		name: '',
		message:
			'Cześć {firstName}, tu Oponexis. Zbliża się sezon wymiany opon. Chcesz umówić termin? Odpisz TAK albo zadzwoń.',
		delaySeconds: 7,
		scheduledAt: '',
	})

	const query = useMemo(() => {
		const params = new URLSearchParams()
		Object.entries(filters).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				if (value.length) params.set(key, value.join(','))
			} else if (value) {
				params.set(key, value)
			}
		})
		return params.toString()
	}, [filters])

	useEffect(() => {
		let cancelled = false
		async function load() {
			setLoading(true)
			const res = await fetch(`/api/admin/season?${query}`, { cache: 'no-store' })
			const json = await res.json()
			if (!cancelled) {
				setData(json.success ? json : null)
				setLoading(false)
			}
		}

		load().catch(error => {
			console.error(error)
			messageToast.error('Nie udało się załadować sezonu', 5)
			if (!cancelled) setLoading(false)
		})

		return () => {
			cancelled = true
		}
	}, [query])

	function updateFilter(field, value) {
		setFilters(current => ({ ...current, [field]: value }))
		setPage(1)
	}

	async function updateStatus(customer, status) {
		setSavingId(customer.id)
		try {
			const res = await fetch('/api/admin/season', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: customer.id,
					season: filters.seasons[0],
					year: Number(filters.year),
					status,
					note: customer.contactNote || '',
				}),
			})
			const json = await res.json()
			if (!res.ok || !json.success) {
				throw new Error(json.error || 'Nie zapisano statusu.')
			}
			setData(current => ({
				...current,
				customers: current.customers.map(item =>
					item.id === customer.id ? { ...item, contactStatus: status } : item
				),
			}))
			setSelectedCustomer(current =>
				current?.id === customer.id ? { ...current, contactStatus: status } : current
			)
			messageToast.success('Zapisano status')
		} catch (error) {
			console.error(error)
			messageToast.error(error.message || 'Błąd zapisu', 5)
		} finally {
			setSavingId('')
		}
	}

	function toggleSeason(season) {
		setFilters(current => {
			const selected = new Set(current.seasons)
			if (selected.has(season) && selected.size > 1) selected.delete(season)
			else selected.add(season)
			return { ...current, seasons: Array.from(selected) }
		})
		setPage(1)
	}

	function toggleWholeYear() {
		setFilters(current => {
			const all = seasonOptions.map(option => option.value)
			const isWholeYear = current.seasons.length === all.length
			return { ...current, seasons: isWholeYear ? [currentSeason()] : all }
		})
		setPage(1)
	}

	const overview = data?.overview
	const customers = data?.customers || []
	const tableItems = customers
	const pageCount = Math.max(1, Math.ceil(tableItems.length / PAGE_SIZE))
	const currentPage = Math.min(page, pageCount)
	const visibleItems = tableItems.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE
	)
	const maxOrders = Math.max(
		1,
		...(overview?.ordersBySeason || []).map(item => item.orders)
	)

	return (
		<section className='space-y-5'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold text-white'>Sezon</h1>
					<p className='text-sm text-[#d7e4ef]'>
						Klienci, powroty i baza pod kampanie sezonowe.
					</p>
				</div>
				<Button type='button' variant='secondary' onClick={() => setCampaignOpen(true)}>
					Utwórz kampanię SMS
				</Button>
			</div>

			<div className='opx-panel grid gap-3 rounded-md p-4 md:grid-cols-3 xl:grid-cols-8'>
				<Filter label='Sezony'>
					<div className='relative'>
						<button
							type='button'
							onClick={() => setSeasonMenuOpen(open => !open)}
							onBlur={event => {
								if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
									setSeasonMenuOpen(false)
								}
							}}
							className='opx-input cursor-pointer text-left text-sm'
						>
							{filters.seasons.length === seasonOptions.length
								? 'Cały rok'
								: filters.seasons.map(seasonName).join(', ')}
						</button>
						{seasonMenuOpen ? (
						<div className='absolute z-20 mt-2 w-56 rounded-md border border-[#d9e4ee] bg-white p-2 shadow-xl'>
							<label className='flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-[#132c43] hover:bg-[#f4f8fb]'>
								<input
									type='checkbox'
									checked={filters.seasons.length === seasonOptions.length}
									onChange={toggleWholeYear}
									className='h-4 w-4 accent-[#fd6d02]'
								/>
								Cały rok
							</label>
							<div className='my-1 h-px bg-[#e7eef5]' />
							{seasonOptions.map(option => (
								<label
									key={option.value}
									className='flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-[#132c43] hover:bg-[#f4f8fb]'
								>
									<input
										type='checkbox'
										checked={filters.seasons.includes(option.value)}
										onChange={() => toggleSeason(option.value)}
										className='h-4 w-4 accent-[#fd6d02]'
									/>
									{option.label}
								</label>
							))}
						</div>
						) : null}
					</div>
				</Filter>
				<Filter label='Rok'>
					<input
						type='number'
						value={filters.year}
						onChange={event => updateFilter('year', event.target.value)}
						className='opx-input'
					/>
				</Filter>
				<Filter label='Zakres listy'>
					<select
						value={filters.scope}
						onChange={event => updateFilter('scope', event.target.value)}
						className='opx-input'
					>
						<option value='season'>Wybrany sezon</option>
						<option value='previous_no_repeat'>Do odzyskania</option>
						<option value='all'>Cała baza</option>
					</select>
				</Filter>
				<Filter label='Status'>
					<select
						value={filters.status}
						onChange={event => updateFilter('status', event.target.value)}
						className='opx-input'
					>
						<option value=''>Wszystkie</option>
						{(data?.statuses || Object.keys(statusLabels)).map(status => (
							<option key={status} value={status}>
								{statusLabels[status] || status}
							</option>
						))}
					</select>
				</Filter>
				<Filter label='Źródło'>
					<select
						value={filters.source}
						onChange={event => updateFilter('source', event.target.value)}
						className='opx-input'
					>
						<option value=''>Wszystkie</option>
						{(overview?.sources || []).map(source => (
							<option key={source} value={source}>
								{source}
							</option>
						))}
					</select>
				</Filter>
				<Filter label='Powrót'>
					<select
						value={filters.repeat}
						onChange={event => updateFilter('repeat', event.target.value)}
						className='opx-input'
					>
						<option value=''>Wszyscy</option>
						<option value='yes'>Powracający</option>
						<option value='no'>Pierwszy raz</option>
					</select>
				</Filter>
				<Filter label='Przechowanie'>
					<select
						value={filters.storage}
						onChange={event => updateFilter('storage', event.target.value)}
						className='opx-input'
					>
						<option value=''>Wszyscy</option>
						<option value='yes'>Ma storage</option>
						<option value='no'>Bez storage</option>
					</select>
				</Filter>
				<Filter label='Szukaj'>
					<input
						value={filters.search}
						onChange={event => updateFilter('search', event.target.value)}
						placeholder='Imię, telefon, usługa'
						className='opx-input'
					/>
				</Filter>
			</div>

			{loading ? (
				<div className='py-10 text-center'>
					<Spin tip='Ładowanie sezonu...' />
				</div>
			) : (
				<>
					<div className='grid gap-4 xl:grid-cols-[1fr_1fr]'>
						<KpiGroup
							title={`Wybrany sezon: ${overview?.selectedSeasonLabel || ''}`}
							description='Te liczby zmieniają się po wyborze sezonu i roku.'
							items={[
								['Zlecenia', overview?.seasonOrders],
								['Klienci', overview?.seasonCustomers],
								['Przychód', formatMoney(overview?.seasonRevenue)],
								['Średni rachunek', formatMoney(overview?.seasonAverageCheck)],
							]}
						/>
						<KpiGroup
							title='Cała baza'
							description='Ogólne dane ze wszystkich wykonanych zleceń.'
							items={[
								['Klienci', overview?.totalCustomers],
								['Powracający', overview?.repeatCustomers],
								['Z przechowaniem', overview?.customersWithStorage],
								['Do odzyskania', overview?.withoutRepeatFromPrevious],
							]}
						/>
					</div>

					<div className='grid gap-4 xl:grid-cols-[1fr_360px]'>
						<div className='opx-panel overflow-hidden rounded-md'>
							<div className='flex flex-wrap items-center justify-between gap-3 border-b border-[#d9e4ee] px-4 py-3'>
								<div>
									<h2 className='font-bold text-[#132c43]'>
										{scopeLabels[filters.scope] || 'Klienci'}
									</h2>
									<p className='text-xs text-[#5f7487]'>
										{tableItems.length} pozycji po filtrach
									</p>
								</div>
								<Pagination
									page={currentPage}
									pageCount={pageCount}
									onPage={setPage}
								/>
							</div>
							<div className='hidden overflow-x-auto lg:block'>
								<table className='min-w-full divide-y divide-[#eef3f7] text-sm'>
									<thead className='bg-[#f4f8fb] text-left text-xs uppercase text-[#5f7487]'>
										<tr>
											<th className='px-3 py-3'>Klient</th>
											<th className='px-3 py-3'>Ostatnio</th>
											<th className='px-3 py-3'>Usługi</th>
											<th className='px-3 py-3'>Sezon</th>
											<th className='px-3 py-3'>Zam.</th>
											<th className='px-3 py-3'>LTV</th>
											<th className='px-3 py-3'>Status</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-[#eef3f7]'>
										{visibleItems.map(customer => (
											<CustomerRow
												key={customer.id}
												customer={customer}
												saving={savingId === customer.id}
												onStatus={updateStatus}
												onOpen={setSelectedCustomer}
											/>
										))}
									</tbody>
								</table>
							</div>
							<div className='space-y-3 p-3 lg:hidden'>
								{visibleItems.map(customer => (
									<CustomerCard
										key={customer.id}
										customer={customer}
										saving={savingId === customer.id}
										onStatus={updateStatus}
										onOpen={setSelectedCustomer}
									/>
								))}
							</div>
							<div className='border-t border-[#d9e4ee] px-4 py-3'>
								<Pagination page={currentPage} pageCount={pageCount} onPage={setPage} />
							</div>
						</div>

						<div className='space-y-4'>
							<div className='opx-panel rounded-md p-4'>
								<h2 className='font-bold text-[#132c43]'>Zamówienia po sezonach</h2>
								<p className='text-xs text-[#5f7487]'>
									Kliknij sezon, żeby zobaczyć listę zleceń.
								</p>
								<div className='mt-4 space-y-3'>
									{(overview?.ordersBySeason || []).map(item => (
										<button
											type='button'
											key={item.key}
											onClick={() => setSelectedSeason(item)}
											className='block w-full rounded-md p-2 text-left transition hover:bg-[#f4f8fb]'
										>
											<div className='mb-1 flex justify-between text-xs font-semibold text-[#5f7487]'>
												<span>
													{item.label || seasonPeriodLabel(item.season, item.year)}
												</span>
												<span>
													{item.orders} · {formatMoney(item.revenue)}
												</span>
											</div>
											<div className='h-2 rounded-full bg-[#e7eef5]'>
												<div
													className='h-2 rounded-full bg-[#fd6d02]'
													style={{ width: `${(item.orders / maxOrders) * 100}%` }}
												/>
											</div>
										</button>
									))}
								</div>
							</div>

							<div className='opx-panel rounded-md p-4'>
								<h2 className='font-bold text-[#132c43]'>Statusy kontaktu</h2>
								<div className='mt-3 grid grid-cols-2 gap-2 text-sm'>
									{(overview?.statusCounts || []).map(item => (
										<div key={item.status} className='rounded-md bg-[#f4f8fb] p-2'>
											<p className='text-xs text-[#5f7487]'>
												{statusLabels[item.status] || item.status}
											</p>
											<p className='text-lg font-bold text-[#132c43]'>{item.count}</p>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</>
			)}

			{selectedCustomer ? (
				<CustomerModal
					customer={selectedCustomer}
					onClose={() => setSelectedCustomer(null)}
					onStatus={updateStatus}
					saving={savingId === selectedCustomer.id}
				/>
			) : null}

			{selectedSeason ? (
				<SeasonModal item={selectedSeason} onClose={() => setSelectedSeason(null)} />
			) : null}

			{campaignOpen ? (
				<CampaignModal
					form={campaignForm}
					onChange={setCampaignForm}
					onClose={() => setCampaignOpen(false)}
					customers={customers}
					loading={creatingCampaign}
					onCreate={async selectedCustomers => {
						setCreatingCampaign(true)
						try {
							const res = await fetch('/api/admin/sms-campaigns', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({
									...campaignForm,
									filters,
									recipients: selectedCustomers.map(customer => ({
										customerId: String(customer.id).startsWith('completion-')
											? null
											: customer.id,
										name: customer.name,
										phone: customer.phone,
									})),
								}),
							})
							const json = await res.json()
							if (!res.ok || !json.success) {
								throw new Error(json.error || 'Nie utworzono kampanii.')
							}
							messageToast.success('Utworzono kampanię SMS')
							router.push(`/admin/sms-campaigns/${json.data.id}`)
						} catch (error) {
							messageToast.error(error.message || 'Błąd kampanii', 5)
						} finally {
							setCreatingCampaign(false)
						}
					}}
				/>
			) : null}
		</section>
	)
}

function Filter({ label, children }) {
	return (
		<label className='space-y-1 text-xs font-bold uppercase text-[#5f7487]'>
			<span>{label}</span>
			{children}
		</label>
	)
}

function KpiGroup({ title, description, items }) {
	return (
		<div className='opx-panel rounded-md p-4'>
			<div className='mb-3'>
				<h2 className='font-bold text-[#132c43]'>{title}</h2>
				<p className='text-xs text-[#5f7487]'>{description}</p>
			</div>
			<div className='grid gap-3 sm:grid-cols-2'>
				{items.map(([label, value]) => (
					<div key={label} className='rounded-md bg-[#f4f8fb] p-3'>
						<p className='text-xs font-bold uppercase text-[#5f7487]'>{label}</p>
						<p className='mt-1 text-2xl font-black text-[#132c43]'>{value ?? 0}</p>
					</div>
				))}
			</div>
		</div>
	)
}

function CustomerRow({ customer, saving, onStatus, onOpen }) {
	return (
		<tr
			onClick={() => onOpen(customer)}
			className='cursor-pointer transition hover:bg-[#f8fbfd]'
		>
			<td className='px-3 py-3'>
				<p className='font-bold text-[#132c43]'>{customer.name}</p>
				<p className='text-xs text-[#5f7487]'>{customer.phone}</p>
				{customer.source ? <p className='text-xs text-[#2c70b7]'>{customer.source}</p> : null}
			</td>
			<td className='px-3 py-3 text-[#132c43]'>
				<p>{formatDate(customer.lastOrderDate)}</p>
				<p className='text-xs text-[#5f7487]'>{customer.lastService || '-'}</p>
			</td>
			<td className='max-w-64 px-3 py-3 text-xs text-[#314a60]'>
				{customer.services.slice(0, 4).join(', ') || '-'}
				{customer.hasStorage ? (
					<span className='ml-2 rounded bg-[#eaf5ff] px-1.5 py-0.5 font-bold text-[#2c70b7]'>
						storage
					</span>
				) : null}
			</td>
			<td className='px-3 py-3 font-bold text-[#132c43]'>
				{customer.ordersInSeason} / {formatMoney(customer.spentInSeason)}
			</td>
			<td className='px-3 py-3 font-bold text-[#132c43]'>{customer.totalOrders}</td>
			<td className='px-3 py-3 font-bold text-[#132c43]'>{formatMoney(customer.totalSpent)}</td>
			<td className='px-3 py-3' onClick={event => event.stopPropagation()}>
				<StatusSelect customer={customer} saving={saving} onStatus={onStatus} />
			</td>
		</tr>
	)
}

function CustomerCard({ customer, saving, onStatus, onOpen }) {
	return (
		<div
			role='button'
			tabIndex={0}
			onClick={() => onOpen(customer)}
			onKeyDown={event => {
				if (event.key === 'Enter') onOpen(customer)
			}}
			className='rounded-md border border-[#d9e4ee] bg-white p-3'
		>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<p className='font-bold text-[#132c43]'>{customer.name}</p>
					<p className='text-sm text-[#5f7487]'>{customer.phone}</p>
					{customer.source ? <p className='text-xs text-[#2c70b7]'>{customer.source}</p> : null}
				</div>
				<p className='font-bold text-[#132c43]'>{formatMoney(customer.totalSpent)}</p>
			</div>
			<div className='mt-3 grid grid-cols-2 gap-2 text-sm text-[#132c43]'>
				<p>
					<span className='text-[#5f7487]'>Zam.</span> {customer.totalOrders}
				</p>
				<p>
					<span className='text-[#5f7487]'>Sezon</span> {customer.ordersInSeason}
				</p>
				<p className='col-span-2'>
					<span className='text-[#5f7487]'>Ostatnio</span>{' '}
					{formatDate(customer.lastOrderDate)}
				</p>
			</div>
			<p className='mt-2 text-xs text-[#314a60]'>{customer.services.join(', ') || '-'}</p>
			<div className='mt-3' onClick={event => event.stopPropagation()}>
				<StatusSelect customer={customer} saving={saving} onStatus={onStatus} />
			</div>
		</div>
	)
}

function StatusSelect({ customer, saving, onStatus }) {
	const detached = String(customer.id || '').startsWith('completion-')
	return (
		<select
			value={customer.contactStatus}
			disabled={saving || detached}
			onChange={event => onStatus(customer, event.target.value)}
			className='opx-input min-w-40 py-1.5 text-xs'
		>
			{Object.entries(statusLabels).map(([value, label]) => (
				<option key={value} value={value}>
					{label}
				</option>
			))}
		</select>
	)
}

function Pagination({ page, pageCount, onPage }) {
	if (pageCount <= 1) return null
	return (
		<div className='flex items-center gap-2 text-xs font-bold text-[#5f7487]'>
			<button
				type='button'
				onClick={() => onPage(Math.max(1, page - 1))}
				disabled={page <= 1}
				className='rounded-md border border-[#d9e4ee] px-2 py-1 disabled:opacity-40'
			>
				Poprzednia
			</button>
			<span>
				{page} / {pageCount}
			</span>
			<button
				type='button'
				onClick={() => onPage(Math.min(pageCount, page + 1))}
				disabled={page >= pageCount}
				className='rounded-md border border-[#d9e4ee] px-2 py-1 disabled:opacity-40'
			>
				Następna
			</button>
		</div>
	)
}

function Modal({ title, subtitle, onClose, children }) {
	return (
		<div className='fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:p-4'>
			<div className='mx-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-md bg-white p-4 shadow-2xl sm:rounded-md'>
				<div className='mb-4 flex items-start justify-between gap-3 border-b border-[#d9e4ee] pb-3'>
					<div>
						<h2 className='text-xl font-black text-[#132c43]'>{title}</h2>
						{subtitle ? <p className='text-sm text-[#5f7487]'>{subtitle}</p> : null}
					</div>
					<button
						type='button'
						onClick={onClose}
						className='rounded-md border border-[#d9e4ee] px-3 py-1.5 text-sm font-bold text-[#132c43]'
					>
						Zamknij
					</button>
				</div>
				{children}
			</div>
		</div>
	)
}

function CustomerModal({ customer, onClose, onStatus, saving }) {
	return (
		<Modal title={customer.name} subtitle={customer.phone} onClose={onClose}>
			<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
				<MiniStat label='Źródło' value={customer.source || '-'} />
				<MiniStat label='Zlecenia' value={customer.totalOrders} />
				<MiniStat label='LTV' value={formatMoney(customer.totalSpent)} />
				<MiniStat label='Średnio' value={formatMoney(customer.averageCheck)} />
			</div>

			<div className='mt-4 grid gap-4 md:grid-cols-[1fr_220px]'>
				<div>
					<h3 className='mb-2 font-bold text-[#132c43]'>Historia klienta</h3>
					<div className='space-y-2'>
						{(customer.history || []).map(item => (
							<HistoryItem key={item.id} item={item} />
						))}
						{!customer.history?.length ? (
							<p className='rounded-md bg-[#f4f8fb] p-3 text-sm text-[#5f7487]'>
								Brak wykonanych zleceń.
							</p>
						) : null}
					</div>
				</div>
				<div>
					<h3 className='mb-2 font-bold text-[#132c43]'>Kontakt sezonowy</h3>
					<StatusSelect customer={customer} saving={saving} onStatus={onStatus} />
					<p className='mt-3 text-xs text-[#5f7487]'>
						Przechowanie: {customer.hasStorage ? 'tak' : 'nie'}
					</p>
					<p className='mt-1 text-xs text-[#5f7487]'>
						Usługi: {customer.services?.join(', ') || '-'}
					</p>
				</div>
			</div>
		</Modal>
	)
}

function SeasonModal({ item, onClose }) {
	return (
		<Modal
			title={item.label || seasonPeriodLabel(item.season, item.year)}
			subtitle={`${item.orders} zleceń · ${formatMoney(item.revenue)}`}
			onClose={onClose}
		>
			<div className='space-y-2'>
				{(item.items || [])
					.slice()
					.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
					.map(order => (
						<HistoryItem key={order.id} item={order} />
					))}
			</div>
		</Modal>
	)
}

function CampaignModal({ form, onChange, customers, onClose, onCreate, loading }) {
	const [selected, setSelected] = useState(() => new Set(customers.map(item => item.id)))
	const selectedCustomers = customers.filter(item => selected.has(item.id))

	function toggle(id) {
		setSelected(current => {
			const next = new Set(current)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	return (
		<Modal
			title='Nowa kampania SMS'
			subtitle={`${selectedCustomers.length} odbiorców z aktualnych filtrów`}
			onClose={onClose}
		>
			<div className='space-y-4'>
				<label className='block space-y-2 text-sm font-bold text-[#132c43]'>
					<span>Nazwa kampanii</span>
					<input
						value={form.name}
						onChange={event =>
							onChange(current => ({ ...current, name: event.target.value }))
						}
						className='opx-input'
						placeholder='Jesień 2026 - powrót klientów'
					/>
				</label>
				<label className='block space-y-2 text-sm font-bold text-[#132c43]'>
					<span>Treść SMS</span>
					<textarea
						value={form.message}
						onChange={event =>
							onChange(current => ({ ...current, message: event.target.value }))
						}
						rows={4}
						className='opx-input resize-none'
					/>
					<span className='block text-xs font-normal text-[#5f7487]'>
						Zmienne: {'{name}'}, {'{firstName}'}, {'{phone}'}
					</span>
				</label>
				<label className='block space-y-2 text-sm font-bold text-[#132c43]'>
					<span>Opóźnienie między SMS</span>
					<input
						type='number'
						min='0'
						max='30'
						value={form.delaySeconds}
						onChange={event =>
							onChange(current => ({
								...current,
								delaySeconds: Number(event.target.value),
							}))
						}
						className='opx-input'
					/>
				</label>
				<label className='block space-y-2 text-sm font-bold text-[#132c43]'>
					<span>Start kampanii</span>
					<input
						type='datetime-local'
						value={form.scheduledAt}
						onChange={event =>
							onChange(current => ({ ...current, scheduledAt: event.target.value }))
						}
						className='opx-input'
					/>
					<span className='block text-xs font-normal text-[#5f7487]'>
						Zostaw puste, jeśli chcesz uruchomić ręcznie.
					</span>
				</label>

				<div className='max-h-72 overflow-y-auto rounded-md border border-[#d9e4ee]'>
					{customers.map(customer => (
						<label
							key={customer.id}
							className='flex items-center gap-3 border-b border-[#eef3f7] px-3 py-2 text-sm last:border-b-0'
						>
							<input
								type='checkbox'
								checked={selected.has(customer.id)}
								onChange={() => toggle(customer.id)}
								className='h-4 w-4 accent-[#fd6d02]'
							/>
							<span className='min-w-0 flex-1'>
								<span className='block font-bold text-[#132c43]'>{customer.name}</span>
								<span className='block text-xs text-[#5f7487]'>{customer.phone}</span>
							</span>
							<span className='text-xs text-[#5f7487]'>{customer.contactStatus}</span>
						</label>
					))}
				</div>

				<div className='flex flex-wrap gap-2'>
					<Button
						type='button'
						onClick={() => onCreate(selectedCustomers)}
						loading={loading}
						disabled={!selectedCustomers.length}
					>
						Utwórz kampanię
					</Button>
					<Button type='button' variant='secondary' onClick={onClose}>
						Anuluj
					</Button>
				</div>
			</div>
		</Modal>
	)
}

function MiniStat({ label, value }) {
	return (
		<div className='rounded-md bg-[#f4f8fb] p-3'>
			<p className='text-xs font-bold uppercase text-[#5f7487]'>{label}</p>
			<p className='mt-1 font-black text-[#132c43]'>{value}</p>
		</div>
	)
}

function HistoryItem({ item }) {
	const content = (
		<div className='rounded-md border border-[#d9e4ee] p-3 text-sm'>
			<div className='flex flex-wrap items-start justify-between gap-2'>
				<div>
					<p className='font-bold text-[#132c43]'>{item.name || '-'}</p>
					<p className='text-xs text-[#5f7487]'>
						{formatDate(item.date)} · {item.phone || '-'}
					</p>
				</div>
				<p className='font-black text-[#132c43]'>{formatMoney(item.amount)}</p>
			</div>
			<p className='mt-2 text-[#314a60]'>{item.services?.join(', ') || '-'}</p>
			<div className='mt-2 flex flex-wrap gap-2 text-xs text-[#5f7487]'>
				{item.source ? <span>Źródło: {item.source}</span> : null}
				{item.paymentMethod ? <span>Płatność: {item.paymentMethod}</span> : null}
				{item.car ? <span>Auto: {item.car}</span> : null}
			</div>
			{item.notes ? <p className='mt-2 text-xs text-[#5f7487]'>{item.notes}</p> : null}
		</div>
	)

	if (item.workOrderId) {
		return (
			<a href={`/admin/work-order?id=${item.workOrderId}`} className='block'>
				{content}
			</a>
		)
	}

	return content
}
