// components/ui/OrderAddressInput.jsx
'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { MapLocationIcon } from '../Icons'
import Modal from './modal'

// карта отдельно, чтобы не падать на SSR
const OrderMapClient = dynamic(() => import('./OrderMapClient'), {
	ssr: false,
})

const DEFAULT_CENTER = { lat: 50.675, lng: 17.92 } // Opole

export default function OrderAddressInput({ value, onChange, error }) {
	const [localValue, setLocalValue] = useState(value || '')
	const [openMap, setOpenMap] = useState(false)
	const [mapKey, setMapKey] = useState(0)

	function handleInputChange(e) {
		const v = e.target.value
		setLocalValue(v)
		// ручной ввод → просто строка
		onChange?.(v)
	}

	function handleOpenMap() {
		// при каждом открытии ремонтируем карту, чтобы не было старого маркера
		setMapKey(prev => prev + 1)
		setOpenMap(true)
	}

	function handleMapSelect({ lat, lng, address }) {
		setLocalValue(address)
		// выбор на карте → объект с координатами
		onChange?.({
			address,
			lat,
			lng,
		})
		setOpenMap(false)
	}

	return (
		<div className='space-y-1'>
			<div className='relative'>
				<input
					value={localValue}
					onChange={handleInputChange}
					placeholder='Np. ul. Wiejska 12, Opole'
					className={`w-full rounded-lg px-3 py-2 text-sm bg-slate-800/80 border ${
						error ? 'border-red-500' : 'border-slate-700'
					} text-slate-100 pr-10`}
				/>

				<button
					type='button'
					onClick={handleOpenMap}
					className='absolute inset-y-0 right-2 flex items-center'
					aria-label='Wybierz na mapie'
				>
					<MapLocationIcon className='w-5 h-5 stroke-secondary-orange text-orange-400' />
				</button>
			</div>

			{error && <p className='text-xs text-red-400'>{error}</p>}

			<Modal visible={openMap} onClose={() => setOpenMap(false)}>
				{/* Этот контейнер точно впишется в Modal (max-h 80vh) */}
				<div className='w-full h-[60vh]'>
					<OrderMapClient
						key={mapKey}
						center={DEFAULT_CENTER}
						onSelect={handleMapSelect}
					/>
				</div>
			</Modal>
		</div>
	)
}
