'use client'

import { useEffect, useState } from 'react'
import messageToast from '../_components/message'
import Button from '../_components/ui/Button'
import Input from '../_components/ui/Input'
import Spin from '../_components/ui/Spin'
import StatusNotice from '../_components/ui/StatusNotice'
import TextArea from '../_components/ui/TextArea'

const emptyService = () => ({
	id: `new-${Date.now()}-${Math.random()}`,
	isNew: true,
	name: '',
	description: '',
	duration: 30,
	price: 0,
	originalPrice: '',
	additionalServices: [],
})

const emptyAdditional = () => ({
	id: `new-add-${Date.now()}-${Math.random()}`,
	name: '',
	description: '',
	price: 0,
})

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

export default function ServicesPage() {
	const [services, setServices] = useState([])
	const [originalServices, setOriginalServices] = useState([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [notice, setNotice] = useState(null)

	useEffect(() => {
		async function load() {
			const res = await fetch('/api/admin/services', { cache: 'no-store' })
			const json = await res.json()
			setServices(json.data || [])
			setOriginalServices(json.data || [])
			setLoading(false)
		}

		load()
	}, [])

	function updateService(index, field, value) {
		setServices(current =>
			current.map((service, serviceIndex) =>
				serviceIndex === index ? { ...service, [field]: value } : service
			)
		)
	}

	function updateAdditional(serviceIndex, additionalIndex, field, value) {
		setServices(current =>
			current.map((service, index) => {
				if (index !== serviceIndex) return service
				return {
					...service,
					additionalServices: service.additionalServices.map((item, itemIndex) =>
						itemIndex === additionalIndex ? { ...item, [field]: value } : item
					),
				}
			})
		)
	}

	function addAdditional(serviceIndex) {
		setServices(current =>
			current.map((service, index) =>
				index === serviceIndex
					? {
							...service,
							additionalServices: [
								...(service.additionalServices || []),
								emptyAdditional(),
							],
					  }
					: service
			)
		)
	}

	function removeAdditional(serviceIndex, additionalIndex) {
		setServices(current =>
			current.map((service, index) =>
				index === serviceIndex
					? {
							...service,
							additionalServices: service.additionalServices.filter(
								(_, itemIndex) => itemIndex !== additionalIndex
							),
					  }
					: service
			)
		)
	}

	async function save() {
		setSaving(true)
		setNotice(null)
		const res = await fetch('/api/admin/services', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ services }),
		})
		const json = await res.json()
		setSaving(false)

		if (json.success) {
			setServices(json.data || [])
			setOriginalServices(json.data || [])
			setNotice({ type: 'success', text: 'Zapisano usługi' })
			messageToast.success('Zapisano usługi')
		} else {
			const error = json.error || 'Nie udało się zapisać usług'
			setNotice({ type: 'error', text: error })
			messageToast.error(error, 5)
		}
	}

	function serviceState(service) {
		if (service.isNew || String(service.id || '').startsWith('new-')) return 'new'
		const original = originalServices.find(item => item.id === service.id)
		if (!original) return 'new'
		return JSON.stringify(original) === JSON.stringify(service) ? 'clean' : 'changed'
	}

	const changedCount = services.filter(service => serviceState(service) !== 'clean').length

	return (
		<section className='space-y-5'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold text-white'>Usługi</h1>
					<p className='text-sm text-[#d7e4ef]'>Ceny, czas trwania i dodatki.</p>
				</div>
				<div className='flex gap-2'>
					<Button
						type='button'
						onClick={() => setServices(current => [...current, emptyService()])}
						variant='secondary'
					>
						Dodaj usługę
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
				{notice ? <StatusNotice notice={notice} /> : null}
			</div>

			{loading ? (
				<div className='py-10 text-center'>
					<Spin tip='Ładowanie usług...' />
				</div>
			) : (
				<Spin spinning={saving} tip='Zapisywanie...'>
				<div className='space-y-3'>
					<div className='space-y-3 md:hidden'>
						{services.map((service, index) => {
							const state = serviceState(service)
							return (
								<div
									key={service.id}
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
												Usługa
											</p>
											<p className='font-semibold'>
												{service.name || 'Nowa usługa'}
											</p>
										</div>
										<StateBadge state={state} />
									</div>

									<label className='block text-sm font-semibold'>
										Nazwa
										<Input
											value={service.name || ''}
											onChange={event =>
												updateService(index, 'name', event.target.value)
											}
											className='mt-1'
										/>
									</label>

									<label className='block text-sm font-semibold'>
										Opis
										<TextArea
											value={service.description || ''}
											onChange={event =>
												updateService(index, 'description', event.target.value)
											}
											className='mt-1 h-24'
										/>
									</label>

									<div className='grid grid-cols-3 gap-2'>
										<label className='block text-sm font-semibold'>
											Czas
											<Input
												type='number'
												value={service.duration || 0}
												onChange={event =>
													updateService(index, 'duration', event.target.value)
												}
												className='mt-1'
											/>
										</label>
										<label className='block text-sm font-semibold'>
											Cena
											<Input
												type='number'
												value={service.price || 0}
												onChange={event =>
													updateService(index, 'price', event.target.value)
												}
												className='mt-1'
											/>
										</label>
										<label className='block text-sm font-semibold'>
											Stara
											<Input
												type='number'
												value={service.originalPrice ?? ''}
												onChange={event =>
													updateService(index, 'originalPrice', event.target.value)
												}
												className='mt-1'
											/>
										</label>
									</div>

									<div className='space-y-2'>
										<div className='flex items-center justify-between gap-2'>
											<p className='text-sm font-bold'>Dodatki</p>
											<Button
												type='button'
												onClick={() => addAdditional(index)}
												variant='secondary'
												className='px-2 py-1 text-xs'
											>
												Dodaj
											</Button>
										</div>
										{(service.additionalServices || []).length ? (
											(service.additionalServices || []).map(
												(additional, additionalIndex) => (
													<div
														key={additional.id}
														className='grid grid-cols-[1fr_84px_auto] gap-2'
													>
														<Input
															value={additional.name || ''}
															onChange={event =>
																updateAdditional(
																	index,
																	additionalIndex,
																	'name',
																	event.target.value
																)
															}
															placeholder='Nazwa'
														/>
														<Input
															type='number'
															value={additional.price || 0}
															onChange={event =>
																updateAdditional(
																	index,
																	additionalIndex,
																	'price',
																	event.target.value
																)
															}
														/>
														<Button
															type='button'
															onClick={() =>
																removeAdditional(index, additionalIndex)
															}
															variant='secondary'
															className='px-2 text-xs'
														>
															Usuń
														</Button>
													</div>
												)
											)
										) : (
											<p className='rounded-md bg-[#f4f8fb] px-3 py-2 text-sm text-[#5f7487]'>
												Brak dodatków.
											</p>
										)}
									</div>

									<Button
										type='button'
										onClick={() =>
											setServices(current =>
												current.filter((_, itemIndex) => itemIndex !== index)
											)
										}
										variant='danger'
										className='w-full'
									>
										Usuń usługę
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
									<th className='px-3 py-3'>Nazwa</th>
									<th className='px-3 py-3'>Opis</th>
									<th className='px-3 py-3'>Czas</th>
									<th className='px-3 py-3'>Cena</th>
									<th className='px-3 py-3'>Cena stara</th>
									<th className='px-3 py-3'>Akcje</th>
									<th className='px-3 py-3'>Dodatki</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-zinc-100'>
								{services.map((service, index) => {
									const state = serviceState(service)
									return (
									<tr
										key={service.id}
										className={`align-top ${
											state === 'new'
												? 'bg-green-50'
												: state === 'changed'
												? 'bg-orange-50'
												: ''
										}`}
									>
										<td className='px-3 py-3'>
											<div className='mb-2'>
												<StateBadge state={state} />
											</div>
											<Input
												value={service.name || ''}
												onChange={event =>
													updateService(index, 'name', event.target.value)
												}
												className='w-48'
											/>
										</td>
										<td className='px-3 py-3'>
											<TextArea
												value={service.description || ''}
												onChange={event =>
													updateService(index, 'description', event.target.value)
												}
												className='h-20 w-64'
											/>
										</td>
										<td className='px-3 py-3'>
											<Input
												type='number'
												value={service.duration || 0}
												onChange={event =>
													updateService(index, 'duration', event.target.value)
												}
												className='w-20'
											/>
										</td>
										<td className='px-3 py-3'>
											<Input
												type='number'
												value={service.price || 0}
												onChange={event =>
													updateService(index, 'price', event.target.value)
												}
												className='w-24'
											/>
										</td>
										<td className='px-3 py-3'>
											<Input
												type='number'
												value={service.originalPrice ?? ''}
												onChange={event =>
													updateService(index, 'originalPrice', event.target.value)
												}
												className='w-24'
											/>
										</td>
										<td className='px-3 py-3'>
											<Button
												type='button'
												onClick={() =>
													setServices(current =>
														current.filter((_, itemIndex) => itemIndex !== index)
													)
												}
												variant='danger'
												className='px-2 py-1'
											>
												Usuń
											</Button>
										</td>
										<td className='min-w-80 px-3 py-3'>
											<div className='space-y-2'>
												<div className='flex items-center justify-between'>
													<span className='font-medium'>Dodatki</span>
													<Button
														type='button'
														onClick={() => addAdditional(index)}
														variant='secondary'
														className='px-2 py-1 text-xs'
													>
														Dodaj
													</Button>
												</div>
												{(service.additionalServices || []).map(
													(additional, additionalIndex) => (
														<div
															key={additional.id}
															className='grid grid-cols-[1fr_88px_auto] gap-2'
														>
															<Input
																value={additional.name || ''}
																onChange={event =>
																	updateAdditional(
																		index,
																		additionalIndex,
																		'name',
																		event.target.value
																	)
																}
																placeholder='Nazwa'
															/>
															<Input
																type='number'
																value={additional.price || 0}
																onChange={event =>
																	updateAdditional(
																		index,
																		additionalIndex,
																		'price',
																		event.target.value
																	)
																}
															/>
															<Button
																type='button'
																onClick={() =>
																	removeAdditional(index, additionalIndex)
																}
																variant='secondary'
																className='px-2'
															>
																Usuń
															</Button>
														</div>
													)
												)}
											</div>
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
