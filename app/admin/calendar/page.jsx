'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useEffect, useMemo, useState } from 'react'
import Button from '../_components/ui/Button'
import Spin from '../_components/ui/Spin'

const PAGE_SIZE = 8

function dayKey(value) {
	return new Date(value).toISOString().slice(0, 10)
}

function formatTime(value) {
	return new Intl.DateTimeFormat('pl-PL', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Warsaw',
	}).format(new Date(value))
}

function formatDay(value) {
	return new Intl.DateTimeFormat('pl-PL', {
		weekday: 'long',
		day: '2-digit',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Warsaw',
	}).format(new Date(`${value}T12:00:00`))
}

export default function CalendarPage() {
	const [events, setEvents] = useState([])
	const [loading, setLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [view, setView] = useState('calendar')

	useEffect(() => {
		async function load() {
			const res = await fetch('/api/admin/calendar', { cache: 'no-store' })
			const json = await res.json()
			setEvents(json.data || [])
			setLoading(false)
		}

		load()
	}, [])

	const grouped = useMemo(() => {
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		return events
			.filter(event => new Date(event.start) >= today)
			.reduce((acc, event) => {
			const key = dayKey(event.start)
			acc[key] ||= []
			acc[key].push(event)
			return acc
		}, {})
	}, [events])

	const groupedEntries = Object.entries(grouped).sort(([a], [b]) =>
		a.localeCompare(b)
	)
	const totalPages = Math.max(1, Math.ceil(groupedEntries.length / PAGE_SIZE))
	const currentPage = Math.min(page, totalPages)
	const pagedEntries = groupedEntries.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE
	)
	const calendarEvents = useMemo(
		() =>
			events.map(event => ({
				id: String(event.id),
				title: event.title,
				start: event.start,
				end: event.end || event.start,
				extendedProps: event,
				classNames: [
					event.type === 'workOrder'
						? 'opx-calendar-event-work-order'
						: 'opx-calendar-event-reservation',
				],
			})),
		[events]
	)

	return (
		<section className='space-y-5'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold text-white'>Kalendarz</h1>
					<p className='text-sm text-[#d7e4ef]'>
						Dzienny przegląd zleceń i rezerwacji.
					</p>
				</div>
				<div className='flex rounded-md border border-white/20 bg-white/10 p-1'>
					<button
						type='button'
						onClick={() => setView('calendar')}
						className={`rounded px-3 py-1.5 text-sm font-bold transition ${
							view === 'calendar'
								? 'bg-white text-[#132c43]'
								: 'text-white hover:bg-white/10'
						}`}
					>
						Kalendarz
					</button>
					<button
						type='button'
						onClick={() => setView('list')}
						className={`rounded px-3 py-1.5 text-sm font-bold transition ${
							view === 'list'
								? 'bg-white text-[#132c43]'
								: 'text-white hover:bg-white/10'
						}`}
					>
						Lista
					</button>
				</div>
			</div>

			{loading ? (
				<div className='py-10 text-center'>
					<Spin tip='Ładowanie kalendarza...' />
				</div>
			) : view === 'calendar' ? (
				<div className='opx-panel rounded-md p-3 text-[#132c43] md:p-4'>
					<FullCalendar
						plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
						initialView='dayGridMonth'
						locale='pl'
						events={calendarEvents}
						height='auto'
						headerToolbar={{
							left: 'prev,next today',
							center: 'title',
							right: 'dayGridMonth,timeGridWeek,timeGridDay',
						}}
						buttonText={{
							today: 'Dziś',
							month: 'Miesiąc',
							week: 'Tydzień',
							day: 'Dzień',
						}}
						slotMinTime='06:00:00'
						slotMaxTime='22:00:00'
						allDaySlot={false}
						nowIndicator
						eventClick={info => {
							const event = info.event.extendedProps
							if (event.type === 'workOrder') {
								window.location.href = `/admin/work-order?id=${String(
									event.id
								).replace('work-', '')}`
							}
						}}
					/>
				</div>
			) : (
				<div className='space-y-4'>
					{groupedEntries.length ? (
						pagedEntries.map(([date, items]) => (
							<div
								key={date}
								className='opx-panel overflow-hidden rounded-md'
							>
								<div className='border-b border-[#d9e4ee] bg-[#f4f8fb] px-4 py-3 font-semibold capitalize'>
									{formatDay(date)}
								</div>
								<div className='divide-y divide-[#eef3f7]'>
									{items.map(event => (
										<div
											key={event.id}
											className='grid gap-2 p-4 text-sm md:grid-cols-[90px_1fr_150px]'
										>
											<p className='font-semibold text-[#fd6d02]'>
												{formatTime(event.start)}
											</p>
											<div>
												<p className='font-medium'>{event.title}</p>
												<p className='text-[#5f7487]'>
													{event.name || 'Brak danych'} · {event.phone || 'Brak telefonu'}
												</p>
												<p className='text-[#314a60]'>{event.address || 'Brak adresu'}</p>
											</div>
											<p className='text-[#5f7487]'>
												{event.type === 'workOrder' ? 'Zlecenie CRM' : 'Rezerwacja'}
											</p>
										</div>
									))}
								</div>
							</div>
						))
					) : (
						<p className='opx-panel rounded-md p-4 text-sm text-[#5f7487]'>
							Brak wydarzeń w kalendarzu.
						</p>
					)}
					{groupedEntries.length > PAGE_SIZE ? (
						<div className='flex flex-wrap items-center justify-center gap-2'>
							<Button
								type='button'
								onClick={() => setPage(current => Math.max(1, current - 1))}
								disabled={currentPage === 1}
								variant='secondary'
							>
								Poprzednia
							</Button>
							<span className='rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white'>
								{currentPage} / {totalPages}
							</span>
							<Button
								type='button'
								onClick={() =>
									setPage(current => Math.min(totalPages, current + 1))
								}
								disabled={currentPage === totalPages}
								variant='secondary'
							>
								Następna
							</Button>
						</div>
					) : null}
				</div>
			)}
		</section>
	)
}
