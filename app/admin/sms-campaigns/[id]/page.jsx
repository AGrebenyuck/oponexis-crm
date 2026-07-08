'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '../../_components/ui/Button'
import Spin from '../../_components/ui/Spin'

function formatDate(value) {
	if (!value) return '-'
	return new Intl.DateTimeFormat('pl-PL', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value))
}

function toDateTimeLocal(value) {
	if (!value) return ''
	const date = new Date(value)
	const offsetMs = date.getTimezoneOffset() * 60_000
	return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

export default function SmsCampaignPage() {
	const routeParams = useParams()
	const router = useRouter()
	const id = routeParams.id
	const [campaign, setCampaign] = useState(null)
	const [loading, setLoading] = useState(true)
	const [starting, setStarting] = useState(false)
	const [checking, setChecking] = useState(false)
	const [syncing, setSyncing] = useState(false)
	const [savingSchedule, setSavingSchedule] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [error, setError] = useState('')
	const [gateStatus, setGateStatus] = useState(null)
	const [scheduleValue, setScheduleValue] = useState('')

	useEffect(() => {
		if (!id) return
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id])

	async function load() {
		setLoading(true)
		const res = await fetch(`/api/admin/sms-campaigns/${id}`, { cache: 'no-store' })
		const json = await res.json()
		setCampaign(json.data || null)
		setScheduleValue(toDateTimeLocal(json.data?.scheduledAt))
		setLoading(false)
	}

	async function start() {
		setStarting(true)
		setError('')
		try {
			const res = await fetch(`/api/admin/sms-campaigns/${id}/start`, {
				method: 'POST',
			})
			const json = await res.json()
			if (!res.ok || !json.success) throw new Error(json.error || 'Błąd wysyłki')
			await load()
		} catch (startError) {
			setError(startError.message)
		} finally {
			setStarting(false)
		}
	}

	async function checkGate() {
		setChecking(true)
		setError('')
		setGateStatus(null)
		try {
			const res = await fetch('/api/admin/sms-gate/test', { cache: 'no-store' })
			const json = await res.json()
			if (!res.ok || !json.success) throw new Error(json.error || 'Błąd SMSGate')
			setGateStatus(json.data)
		} catch (checkError) {
			setError(checkError.message)
		} finally {
			setChecking(false)
		}
	}

	async function syncStatuses() {
		setSyncing(true)
		setError('')
		try {
			const res = await fetch(`/api/admin/sms-campaigns/${id}/sync`, {
				method: 'POST',
			})
			const json = await res.json()
			if (!res.ok || !json.success) {
				throw new Error(json.error || 'Nie odświeżono statusów')
			}
			await load()
		} catch (syncError) {
			setError(syncError.message)
		} finally {
			setSyncing(false)
		}
	}

	async function saveSchedule(value = scheduleValue) {
		setSavingSchedule(true)
		setError('')
		try {
			const res = await fetch(`/api/admin/sms-campaigns/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scheduledAt: value || null }),
			})
			const json = await res.json()
			if (!res.ok || !json.success) {
				throw new Error(json.error || 'Nie zapisano terminu')
			}
			await load()
		} catch (scheduleError) {
			setError(scheduleError.message)
		} finally {
			setSavingSchedule(false)
		}
	}

	async function deleteCampaign() {
		if (!window.confirm('Usunąć kampanię SMS?')) return
		setDeleting(true)
		setError('')
		try {
			const res = await fetch(`/api/admin/sms-campaigns/${id}`, {
				method: 'DELETE',
			})
			const json = await res.json()
			if (!res.ok || !json.success) throw new Error(json.error || 'Nie usunięto kampanii')
			router.push('/admin/sms-campaigns')
		} catch (deleteError) {
			setError(deleteError.message)
		} finally {
			setDeleting(false)
		}
	}

	if (loading) {
		return (
			<div className='py-10 text-center'>
				<Spin tip='Ładowanie kampanii...' />
			</div>
		)
	}

	if (!campaign) {
		return <div className='opx-panel rounded-md p-4'>Nie znaleziono kampanii.</div>
	}

	return (
		<section className='space-y-5'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold text-white'>{campaign.name}</h1>
					<p className='text-sm text-[#d7e4ef]'>
						{campaign.status} · {campaign.recipients.length} odbiorców
					</p>
					{campaign.scheduledAt ? (
						<p className='text-sm font-bold text-[#fd6d02]'>
							Zaplanowano: {formatDate(campaign.scheduledAt)}
						</p>
					) : null}
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button type='button' variant='ghost' onClick={checkGate} loading={checking}>
						Test SMSGate
					</Button>
					<Button type='button' variant='ghost' onClick={syncStatuses} loading={syncing}>
						Odśwież statusy
					</Button>
					<Button type='button' variant='danger' onClick={deleteCampaign} loading={deleting}>
						Usuń
					</Button>
					<Button
						type='button'
						onClick={start}
						loading={starting}
						disabled={
							!campaign.recipients.some(item =>
								['PENDING', 'FAILED'].includes(item.status)
							)
						}
					>
						Start wysyłki
					</Button>
				</div>
			</div>

			<div className='opx-panel rounded-md p-4'>
				<p className='text-xs font-bold uppercase text-[#5f7487]'>Treść SMS</p>
				<p className='mt-2 whitespace-pre-wrap text-[#132c43]'>{campaign.message}</p>
				<p className='mt-2 text-xs text-[#5f7487]'>
					Zmienne: {'{name}'}, {'{firstName}'}, {'{phone}'}
				</p>
				{error ? <p className='mt-3 text-sm font-bold text-red-600'>{error}</p> : null}
				{gateStatus ? (
					<div className='mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'>
						<p className='font-bold'>SMSGate połączony.</p>
						<p>Serwer: {gateStatus.baseUrl}</p>
						<p>Autoryzacja Basic działa.</p>
						<p>
							Login/hasło wczytane: {gateStatus.usernameLength} /{' '}
							{gateStatus.passwordLength} znaków
						</p>
						<p>
							Device ID: {gateStatus.deviceIdConfigured ? 'wpisany' : 'brak'} /{' '}
							{gateStatus.deviceIdUsed ? 'używany' : 'nieużywany'}
						</p>
					</div>
				) : null}
			</div>

			<div className='opx-panel rounded-md p-4'>
				<p className='text-xs font-bold uppercase text-[#5f7487]'>Planowanie</p>
				<div className='mt-3 flex flex-wrap items-end gap-2'>
					<label className='min-w-64 flex-1 space-y-1 text-sm font-bold text-[#132c43]'>
						<span>Data i godzina startu</span>
						<input
							type='datetime-local'
							value={scheduleValue}
							onChange={event => setScheduleValue(event.target.value)}
							className='opx-input'
						/>
					</label>
					<Button type='button' onClick={() => saveSchedule()} loading={savingSchedule}>
						Zapisz termin
					</Button>
					<Button
						type='button'
						variant='secondary'
						onClick={() => {
							setScheduleValue('')
							saveSchedule('')
						}}
						loading={savingSchedule}
					>
						Start ręczny
					</Button>
				</div>
				<p className='mt-2 text-xs text-[#5f7487]'>
					Zaplanowane kampanie uruchamia endpoint /api/cron/sms-campaigns.
				</p>
			</div>

			<div className='opx-panel overflow-hidden rounded-md'>
				<div className='border-b border-[#d9e4ee] px-4 py-3'>
					<h2 className='font-bold text-[#132c43]'>Odbiorcy</h2>
				</div>
				<div className='divide-y divide-[#eef3f7]'>
					{campaign.recipients.map(recipient => (
						<div
							key={recipient.id}
							className='grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_160px_140px_1fr]'
						>
							<div>
								<p className='font-bold text-[#132c43]'>{recipient.name || '-'}</p>
								<p className='text-[#5f7487]'>{recipient.phone}</p>
							</div>
							<p className='font-bold text-[#132c43]'>{recipient.status}</p>
							<p className='text-[#5f7487]'>
								{recipient.status === 'QUEUED'
									? 'w kolejce'
									: formatDate(recipient.sentAt)}
							</p>
							<p className='text-xs text-red-600'>{recipient.error || ''}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
