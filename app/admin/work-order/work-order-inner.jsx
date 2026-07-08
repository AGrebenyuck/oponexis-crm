'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function WorkOrderEditInner() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const id = searchParams.get('id')

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [closing, setClosing] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	const [form, setForm] = useState({
		name: '',
		phone: '',
		service: '',
		regNumber: '',
		color: '',
		carModel: '',
		address: '',
		notes: '',
		visitDate: '',
		visitTime: '',
		wheelRimSize: '',
		tireSize: '',
		wantsInvoice: false,
		invoiceNip: '',
		invoiceEmail: '',
	})

	useEffect(() => {
		if (!id) {
			return
		}

		async function loadOrder() {
			const controller = new AbortController()
			const timeout = setTimeout(() => controller.abort(), 8000)

			try {
				setLoading(true)
				const res = await fetch(`/api/work-orders/${id}`, {
					cache: 'no-store',
					signal: controller.signal,
				})
				const contentType = res.headers.get('content-type') || ''
				if (!contentType.includes('application/json')) {
					throw new Error(`API zwrocilo nieprawidlowa odpowiedz (${res.status}).`)
				}

				const json = await res.json()

				if (!res.ok || !json.ok) {
					throw new Error(json.error || 'Nie udalo sie pobrac zlecenia.')
				}

				const order = json.order
				setForm({
					name: order.name || '',
					phone: order.phone || '',
					service: order.service || '',
					regNumber: order.regNumber || '',
					color: order.color || '',
					carModel: order.carModel || '',
					address: order.address || '',
					notes: order.notes || '',
					visitDate: order.visitDate
						? new Date(order.visitDate).toISOString().slice(0, 10)
						: '',
					visitTime: order.visitTime || '',
					wheelRimSize: order.wheelRimSize || '',
					tireSize: order.tireSize || '',
					wantsInvoice: !!order.wantsInvoice,
					invoiceNip: order.invoiceNip || '',
					invoiceEmail: order.invoiceEmail || '',
				})
				setError('')
			} catch (loadError) {
				console.error(loadError)
				setError(
					loadError?.name === 'AbortError'
						? 'Przekroczono czas ladowania zlecenia. Sprawdz API CRM.'
						: loadError.message || 'Blad podczas ladowania zlecenia.'
				)
			} finally {
				clearTimeout(timeout)
				setLoading(false)
			}
		}

		loadOrder()
	}, [id])

	function handleChange(event) {
		const { name, value, type, checked } = event.target
		setForm(prev => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}))
		setError('')
		setSuccess('')
	}

	async function handleSubmit(event) {
		event.preventDefault()
		if (!id) return

		setSaving(true)
		setError('')
		setSuccess('')

		try {
			const res = await fetch(`/api/work-orders/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			})
			const json = await res.json()

			if (!res.ok || !json.ok) {
				throw new Error(json.error || 'Nie udalo sie zapisac zmian.')
			}

			setSuccess('Zapisano zmiany. Grafik zostal zaktualizowany.')
		} catch (saveError) {
			console.error(saveError)
			setError(saveError.message || 'Blad podczas zapisywania zmian.')
		} finally {
			setSaving(false)
		}
	}

	async function handleCloseOrder() {
		if (!id) return
		setClosing(true)
		setError('')
		setSuccess('')

		try {
			const res = await fetch(`/api/work-orders/${id}`, { method: 'DELETE' })
			const json = await res.json()
			if (!res.ok || !json.ok) {
				throw new Error(json.error || 'Nie udało się zamknąć zlecenia.')
			}
			setSuccess('Zlecenie zostało anulowane i ukryte z grafiku.')
			setTimeout(() => router.push('/admin/events'), 700)
		} catch (closeError) {
			console.error(closeError)
			setError(closeError.message || 'Błąd podczas zamykania zlecenia.')
		} finally {
			setClosing(false)
		}
	}

	if (!id) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 px-4'>
				<div className='max-w-md text-center'>
					<h1 className='text-lg font-semibold mb-2'>Brak ID zlecenia</h1>
					<p className='text-sm text-slate-400'>
						Adres powinien zawierac parametr <code>?id=...</code>.
					</p>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-slate-900 text-slate-100'>
				<div className='max-w-md text-center space-y-2'>
					<p className='text-sm text-slate-300'>Ladowanie zlecenia...</p>
					<p className='text-xs text-slate-500'>ID: {id}</p>
				</div>
			</div>
		)
	}

	if (error && !form.name && !form.phone) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 px-4'>
				<div className='w-full max-w-md bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl text-center'>
					<h1 className='text-lg font-semibold mb-2'>
						Nie udalo sie zaladowac zlecenia
					</h1>
					<p className='text-sm text-red-300 mb-3'>{error}</p>
					<p className='text-xs text-slate-500 mb-4'>ID: {id}</p>
					<button
						type='button'
						onClick={() => window.location.reload()}
						className='rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium px-4 py-2'
					>
						Sprobuj ponownie
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 px-4 py-8'>
			<div className='w-full max-w-xl bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl'>
				<div className='flex items-center justify-between mb-4'>
					<h1 className='text-lg font-semibold'>Edytuj zlecenie</h1>
					<button
						type='button'
						onClick={() => router.push('/admin/calendar')}
						className='text-xs text-slate-400 hover:text-slate-200'
					>
						Wroc
					</button>
				</div>

				<form onSubmit={handleSubmit} className='space-y-4'>
					<Field label='Imie' name='name' value={form.name} onChange={handleChange} />
					<Field
						label='Telefon'
						name='phone'
						value={form.phone}
						onChange={handleChange}
					/>
					<Field
						label='Usluga'
						name='service'
						value={form.service}
						onChange={handleChange}
					/>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
						<Field
							label='Data wizyty'
							name='visitDate'
							type='date'
							value={form.visitDate}
							onChange={handleChange}
						/>
						<Field
							label='Godzina wizyty'
							name='visitTime'
							type='time'
							value={form.visitTime}
							onChange={handleChange}
						/>
					</div>

					<Field
						label='Adres'
						name='address'
						value={form.address}
						onChange={handleChange}
					/>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
						<Field
							label='Numer rejestracyjny'
							name='regNumber'
							value={form.regNumber}
							onChange={handleChange}
						/>
						<Field
							label='Kolor auta'
							name='color'
							value={form.color}
							onChange={handleChange}
						/>
					</div>

					<Field
						label='Model auta'
						name='carModel'
						value={form.carModel}
						onChange={handleChange}
					/>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
						<Field
							label='Felga'
							name='wheelRimSize'
							value={form.wheelRimSize}
							onChange={handleChange}
						/>
						<Field
							label='Rozmiar opony'
							name='tireSize'
							value={form.tireSize}
							onChange={handleChange}
						/>
					</div>

					<label className='flex items-center gap-2 text-xs text-slate-300'>
						<input
							type='checkbox'
							name='wantsInvoice'
							checked={form.wantsInvoice}
							onChange={handleChange}
							className='h-4 w-4 rounded border-slate-600 bg-slate-800'
						/>
						Faktura
					</label>

					{form.wantsInvoice ? (
						<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
							<Field
								label='NIP'
								name='invoiceNip'
								value={form.invoiceNip}
								onChange={handleChange}
							/>
							<Field
								label='E-mail do faktury'
								name='invoiceEmail'
								value={form.invoiceEmail}
								onChange={handleChange}
							/>
						</div>
					) : null}

					<div className='space-y-1'>
						<label className='text-xs text-slate-300'>Uwagi</label>
						<textarea
							name='notes'
							value={form.notes}
							onChange={handleChange}
							rows={3}
							className='w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 resize-none'
						/>
					</div>

					{error && <p className='text-xs text-red-400'>{error}</p>}
					{success && <p className='text-xs text-emerald-400'>{success}</p>}

					<button
						type='submit'
						disabled={saving}
						className='w-full inline-flex items-center justify-center rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium py-2.5 disabled:opacity-60'
					>
						{saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
					</button>
					<button
						type='button'
						onClick={() => router.push(`/admin/work-order/complete?id=${id}`)}
						className='w-full inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-900 text-sm font-medium py-2.5 text-slate-100 hover:border-orange-400'
					>
						Otwórz formularz wykonania
					</button>
					<button
						type='button'
						onClick={handleCloseOrder}
						disabled={closing}
						className='w-full inline-flex items-center justify-center rounded-lg border border-red-500/50 bg-red-950/40 text-sm font-medium py-2.5 text-red-100 hover:border-red-400 disabled:opacity-60'
					>
						{closing ? 'Zamykanie...' : 'Anuluj / ukryj zlecenie'}
					</button>
				</form>
			</div>
		</div>
	)
}

function Field({ label, name, value, onChange, type = 'text' }) {
	return (
		<div className='space-y-1'>
			<label className='text-xs text-slate-300'>{label}</label>
			<input
				type={type}
				name={name}
				value={value}
				onChange={onChange}
				className='w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100'
			/>
		</div>
	)
}
