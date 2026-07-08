'use client'

import { useEffect, useState } from 'react'
import messageToast from '../_components/message'
import Button from '../_components/ui/Button'
import Input from '../_components/ui/Input'
import Spin from '../_components/ui/Spin'
import StatusNotice from '../_components/ui/StatusNotice'

const emptyPromo = () => ({
	id: `new-${Date.now()}-${Math.random()}`,
	isNew: true,
	code: '',
	type: 'percentage',
	value: 0,
	uses: 0,
	maxUses: '',
	validUntil: '',
})

function toDateInput(value) {
	if (!value) return ''
	return new Date(value).toISOString().slice(0, 10)
}

function StateBadge({ state }) {
	if (state === 'clean') return null

	return (
		<span
			className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
				state === 'new'
					? 'bg-green-200 text-green-900'
					: 'bg-orange-200 text-orange-900'
			}`}
		>
			{state === 'new' ? 'Nowe' : 'Zmienione'}
		</span>
	)
}

export default function PromocodesPage() {
	const [promocodes, setPromocodes] = useState([])
	const [originalPromocodes, setOriginalPromocodes] = useState([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [notice, setNotice] = useState(null)

	useEffect(() => {
		async function load() {
			const res = await fetch('/api/admin/promocodes', { cache: 'no-store' })
			const json = await res.json()
			setPromocodes(json.data || [])
			setOriginalPromocodes(json.data || [])
			setLoading(false)
		}

		load()
	}, [])

	function updatePromo(index, field, value) {
		setPromocodes(current =>
			current.map((promo, promoIndex) =>
				promoIndex === index ? { ...promo, [field]: value } : promo
			)
		)
	}

	async function save() {
		setSaving(true)
		setNotice(null)
		const res = await fetch('/api/admin/promocodes', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ promocodes }),
		})
		const json = await res.json()
		setSaving(false)

		if (json.success) {
			setPromocodes(json.data || [])
			setOriginalPromocodes(json.data || [])
			setNotice({ type: 'success', text: 'Zapisano promokody' })
			messageToast.success('Zapisano promokody')
		} else {
			const error = json.error || 'Nie udało się zapisać promokodów'
			setNotice({ type: 'error', text: error })
			messageToast.error(error, 5)
		}
	}

	function promoState(promo) {
		if (promo.isNew || String(promo.id || '').startsWith('new-')) return 'new'
		const original = originalPromocodes.find(item => item.id === promo.id)
		if (!original) return 'new'
		return JSON.stringify(original) === JSON.stringify(promo) ? 'clean' : 'changed'
	}

	const changedCount = promocodes.filter(
		promo => promoState(promo) !== 'clean'
	).length

	return (
		<section className='space-y-5'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold text-white'>Promokody</h1>
					<p className='text-sm text-[#d7e4ef]'>Rabaty, limity i ważność kodów.</p>
				</div>
				<div className='flex gap-2'>
					<Button
						type='button'
						onClick={() => setPromocodes(current => [emptyPromo(), ...current])}
						variant='secondary'
					>
						Dodaj kod
					</Button>
					<Button
						type='button'
						onClick={save}
						disabled={saving}
						loading={saving}
					>
						Zapisz
					</Button>
				</div>
			</div>

			<div className='flex flex-wrap items-center gap-2 text-sm'>
				<span className='rounded-md bg-white/10 px-3 py-1.5 font-semibold text-white'>
					Zmiany: {changedCount}
				</span>
			</div>

			<StatusNotice notice={notice} />

			{loading ? (
				<div className='py-10 text-center'>
					<Spin tip='Ładowanie promokodów...' />
				</div>
			) : (
				<Spin spinning={saving} tip='Zapisywanie...'>
				<div className='space-y-3'>
					<div className='space-y-3 md:hidden'>
						{promocodes.map((promo, index) => {
							const state = promoState(promo)
							return (
								<div
									key={promo.id}
									className={`opx-panel space-y-4 rounded-md p-4 text-[#132c43] ${
										state === 'new'
											? 'border-green-300'
											: state === 'changed'
											? 'border-orange-300'
											: ''
									}`}
								>
									<div className='flex items-start justify-between gap-3'>
										<div>
											<p className='text-xs font-bold uppercase text-[#5f7487]'>
												Promokod
											</p>
											<p className='font-semibold uppercase'>
												{promo.code || 'Nowy kod'}
											</p>
										</div>
										<StateBadge state={state} />
									</div>

									<label className='block text-sm font-semibold'>
										Kod
										<Input
											value={promo.code || ''}
											onChange={event =>
												updatePromo(index, 'code', event.target.value)
											}
											className='mt-1 uppercase'
										/>
									</label>

									<div className='grid grid-cols-2 gap-2'>
										<label className='block text-sm font-semibold'>
											Typ
											<select
												value={promo.type || 'percentage'}
												onChange={event =>
													updatePromo(index, 'type', event.target.value)
												}
												className='opx-input mt-1'
											>
												<option value='percentage'>Procentowa</option>
												<option value='fixed'>Kwota</option>
											</select>
										</label>
										<label className='block text-sm font-semibold'>
											Wartość
											<Input
												type='number'
												value={promo.value || 0}
												onChange={event =>
													updatePromo(index, 'value', event.target.value)
												}
												className='mt-1'
											/>
										</label>
										<label className='block text-sm font-semibold'>
											Użycia
											<Input
												type='number'
												value={promo.uses || 0}
												onChange={event =>
													updatePromo(index, 'uses', event.target.value)
												}
												className='mt-1'
											/>
										</label>
										<label className='block text-sm font-semibold'>
											Limit
											<Input
												type='number'
												value={promo.maxUses ?? ''}
												onChange={event =>
													updatePromo(index, 'maxUses', event.target.value)
												}
												className='mt-1'
											/>
										</label>
									</div>

									<label className='block text-sm font-semibold'>
										Ważny do
										<Input
											type='date'
											value={toDateInput(promo.validUntil)}
											onChange={event =>
												updatePromo(index, 'validUntil', event.target.value)
											}
											className='mt-1'
										/>
									</label>

									<Button
										type='button'
										onClick={() =>
											setPromocodes(current =>
												current.filter((_, itemIndex) => itemIndex !== index)
											)
										}
										variant='danger'
										className='w-full'
									>
										Usuń kod
									</Button>
								</div>
							)
						})}
					</div>

					<div className='opx-panel hidden overflow-hidden rounded-md md:block'>
						<div className='overflow-x-auto'>
						<table className='min-w-full divide-y divide-zinc-200 text-sm'>
							<thead className='bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500'>
								<tr>
									<th className='px-3 py-3'>Kod</th>
									<th className='px-3 py-3'>Typ</th>
									<th className='px-3 py-3'>Wartość</th>
									<th className='px-3 py-3'>Użycia</th>
									<th className='px-3 py-3'>Limit</th>
									<th className='px-3 py-3'>Ważny do</th>
									<th className='px-3 py-3'>Akcje</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-zinc-100'>
								{promocodes.map((promo, index) => {
									const state = promoState(promo)
									return (
									<tr
										key={promo.id}
										className={
											state === 'new'
												? 'bg-green-50'
												: state === 'changed'
												? 'bg-orange-50'
												: ''
										}
									>
										<td className='px-3 py-3'>
											<div className='mb-2'>
												<StateBadge state={state} />
											</div>
											<Input
												value={promo.code || ''}
												onChange={event =>
													updatePromo(index, 'code', event.target.value)
												}
												className='w-36 uppercase'
											/>
										</td>
										<td className='px-3 py-3'>
											<select
												value={promo.type || 'percentage'}
												onChange={event =>
													updatePromo(index, 'type', event.target.value)
												}
												className='rounded-md border border-zinc-300 px-2 py-1.5'
											>
												<option value='percentage'>Procentowa</option>
												<option value='fixed'>Kwota</option>
											</select>
										</td>
										<td className='px-3 py-3'>
											<Input
												type='number'
												value={promo.value || 0}
												onChange={event =>
													updatePromo(index, 'value', event.target.value)
												}
												className='w-24'
											/>
										</td>
										<td className='px-3 py-3'>
											<Input
												type='number'
												value={promo.uses || 0}
												onChange={event =>
													updatePromo(index, 'uses', event.target.value)
												}
												className='w-20'
											/>
										</td>
										<td className='px-3 py-3'>
											<Input
												type='number'
												value={promo.maxUses ?? ''}
												onChange={event =>
													updatePromo(index, 'maxUses', event.target.value)
												}
												className='w-20'
											/>
										</td>
										<td className='px-3 py-3'>
											<Input
												type='date'
												value={toDateInput(promo.validUntil)}
												onChange={event =>
													updatePromo(index, 'validUntil', event.target.value)
												}
											/>
										</td>
										<td className='px-3 py-3'>
											<Button
												type='button'
												onClick={() =>
													setPromocodes(current =>
														current.filter((_, itemIndex) => itemIndex !== index)
													)
												}
												variant='danger'
												className='px-2 py-1'
											>
												Usuń
											</Button>
										</td>
									</tr>
									)
								})}
							</tbody>
						</table>
						</div>
					</div>
				</div>
				</Spin>
			)}
		</section>
	)
}
