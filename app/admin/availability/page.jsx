'use client'

import { useEffect, useState } from 'react'
import { WEEKDAYS, DEFAULT_AVAILABILITY } from '@/lib/admin/availability'
import messageToast from '../_components/message'
import Button from '../_components/ui/Button'
import Input from '../_components/ui/Input'
import Spin from '../_components/ui/Spin'
import StatusNotice from '../_components/ui/StatusNotice'

export default function AvailabilityPage() {
	const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY)
	const [originalAvailability, setOriginalAvailability] =
		useState(DEFAULT_AVAILABILITY)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [notice, setNotice] = useState(null)

	useEffect(() => {
		async function load() {
			const res = await fetch('/api/admin/availability', { cache: 'no-store' })
			const json = await res.json()
			if (json.data) {
				setAvailability(json.data)
				setOriginalAvailability(json.data)
			}
			setLoading(false)
		}

		load()
	}, [])

	function updateDay(day, field, value) {
		setAvailability(current => ({
			...current,
			[day]: {
				...current[day],
				[field]: value,
			},
		}))
	}

	async function save() {
		setSaving(true)
		setNotice(null)
		const res = await fetch('/api/admin/availability', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(availability),
		})
		const json = await res.json()
		setSaving(false)

		if (json.success) {
			setAvailability(json.data)
			setOriginalAvailability(json.data)
			setNotice({ type: 'success', text: 'Zapisano dostępność' })
			messageToast.success('Zapisano dostępność')
		} else {
			const error = json.error || 'Nie udało się zapisać dostępności'
			setNotice({ type: 'error', text: error })
			messageToast.error(error, 5)
		}
	}

	function isChanged(path) {
		if (path === 'timeGap') {
			return Number(availability.timeGap) !== Number(originalAvailability.timeGap)
		}

		return (
			JSON.stringify(availability[path] || null) !==
			JSON.stringify(originalAvailability[path] || null)
		)
	}

	const changedCount = [
		'timeGap',
		...WEEKDAYS.map(day => day.key),
	].filter(isChanged).length

	return (
		<section className='space-y-5'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold text-white'>Dostępność</h1>
					<p className='text-sm text-[#d7e4ef]'>Godziny pracy i odstęp slotów.</p>
				</div>
				<Button
					type='button'
					onClick={save}
					disabled={saving}
					loading={saving}
				>
					Zapisz
				</Button>
			</div>

			<div className='flex flex-wrap items-center gap-2 text-sm'>
				<span className='rounded-md bg-white/10 px-3 py-1.5 font-semibold text-white'>
					Zmiany: {changedCount}
				</span>
			</div>

			<StatusNotice notice={notice} />

			{loading ? (
				<div className='py-10 text-center'>
					<Spin tip='Ładowanie dostępności...' />
				</div>
			) : (
				<Spin spinning={saving} tip='Zapisywanie...'>
				<div className='opx-panel rounded-md'>
					<div
						className={`border-b border-zinc-200 p-4 ${
							isChanged('timeGap') ? 'bg-orange-50' : ''
						}`}
					>
						<label className='flex max-w-xs items-center gap-3 text-sm'>
							<span className='font-medium'>Odstęp slotów</span>
							{isChanged('timeGap') ? (
								<span className='rounded-full bg-orange-200 px-2 py-0.5 text-xs font-bold text-orange-900'>
									Zmienione
								</span>
							) : null}
							<Input
								type='number'
								value={availability.timeGap || 30}
								onChange={event =>
									setAvailability(current => ({
										...current,
										timeGap: event.target.value,
									}))
								}
								className='w-24'
							/>
							<span className='text-zinc-500'>min</span>
						</label>
					</div>

					<div className='divide-y divide-zinc-100'>
						{WEEKDAYS.map(day => (
							<div
								key={day.key}
								className={`grid gap-3 p-4 sm:grid-cols-[180px_1fr_1fr] ${
									isChanged(day.key) ? 'bg-orange-50' : ''
								}`}
							>
								<label className='flex items-center gap-3 text-sm font-medium'>
									<input
										type='checkbox'
										checked={Boolean(availability[day.key]?.isAvailable)}
										onChange={event =>
											updateDay(day.key, 'isAvailable', event.target.checked)
										}
										className='h-4 w-4'
									/>
									{day.label}
									{isChanged(day.key) ? (
										<span className='rounded-full bg-orange-200 px-2 py-0.5 text-xs font-bold text-orange-900'>
											Zmienione
										</span>
									) : null}
								</label>
								<label className='flex items-center gap-2 text-sm'>
									<span className='w-12 text-zinc-500'>Od</span>
									<Input
										type='time'
										value={availability[day.key]?.startTime || '09:00'}
										onChange={event =>
											updateDay(day.key, 'startTime', event.target.value)
										}
									/>
								</label>
								<label className='flex items-center gap-2 text-sm'>
									<span className='w-12 text-zinc-500'>Do</span>
									<Input
										type='time'
										value={availability[day.key]?.endTime || '17:00'}
										onChange={event =>
											updateDay(day.key, 'endTime', event.target.value)
										}
									/>
								</label>
							</div>
						))}
					</div>
				</div>
				</Spin>
			)}
		</section>
	)
}
