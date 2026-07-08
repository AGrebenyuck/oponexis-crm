'use client'

import axios from 'axios'
import 'leaflet/dist/leaflet.css'
import debounce from 'lodash.debounce'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import { MapLocationIcon } from '../Icons'
import Input from './input'
import Modal from './modal'

const MapClient = dynamic(() => import('./mapClient'), { ssr: false })

let allowedArea = [
	[17.92185359147328, 50.804243084163694],
	[17.900957167321202, 50.80359244371713],
	[17.880263716242617, 50.801646842455575],
	[17.85997418938931, 50.798425177643296],
	[17.840285516187365, 50.793958735509655],
	[17.82138864844817, 50.78829087983645],
	[17.803466669559114, 50.78147662075168],
	[17.78669298898814, 50.77358206841881],
	[17.77122964113077, 50.76468377753329],
	[17.757225706074685, 50.75486798967894],
	[17.74481586818895, 50.74422978163863],
	[17.734119126599154, 50.73287212868648],
	[17.725237669624555, 50.720904892701256],
	[17.718255923170204, 50.708443745626695],
	[17.71323978092513, 50.695609039358054],
	[17.710236022056176, 50.68252463355438],
	[17.709271919942633, 50.66931669316142],
	[17.710355043401737, 50.65611246758454],
	[17.71347324983884, 50.64303906347685],
	[17.718594867842707, 50.63022222301233],
	[17.72566906495502, 50.61778511930295],
	[17.7346263946889, 50.605847180301346],
	[17.745379515362618, 50.59452295211499],
	[17.75782407195756, 50.58392101215343],
	[17.771839731003716, 50.574142941946064],
	[17.787291357439475, 50.56528236881381],
	[17.804030321478677, 50.55742408486234],
	[17.821895922738726, 50.550643250996295],
	[17.840716918229543, 50.54500469284098],
	[17.860313140262623, 50.5405622946068],
	[17.880497189902222, 50.537358496051574],
	[17.901076191235223, 50.53542389678865],
	[17.92185359147328, 50.53477697126445],
	[17.94263099171134, 50.53542389678865],
	[17.963209993044337, 50.537358496051574],
	[17.983394042683937, 50.5405622946068],
	[18.002990264717017, 50.54500469284098],
	[18.021811260207834, 50.550643250996295],
	[18.039676861467882, 50.55742408486234],
	[18.056415825507084, 50.56528236881381],
	[18.071867451942843, 50.574142941946064],
	[18.085883110989, 50.58392101215343],
	[18.09832766758394, 50.59452295211499],
	[18.109080788257664, 50.605847180301346],
	[18.11803811799154, 50.61778511930295],
	[18.125112315103852, 50.63022222301233],
	[18.130233933107718, 50.64303906347685],
	[18.133352139544826, 50.65611246758454],
	[18.134435263003926, 50.66931669316142],
	[18.133471160890384, 50.68252463355438],
	[18.13046740202143, 50.695609039358054],
	[18.125451259776355, 50.708443745626695],
	[18.118469513322008, 50.720904892701256],
	[18.109588056347405, 50.73287212868648],
	[18.09889131475761, 50.74422978163863],
	[18.086481476871874, 50.75486798967894],
	[18.07247754181579, 50.76468377753329],
	[18.05701419395842, 50.77358206841881],
	[18.040240513387445, 50.78147662075168],
	[18.02231853449839, 50.78829087983645],
	[18.003421666759195, 50.793958735509655],
	[17.98373299355725, 50.798425177643296],
	[17.963443466703943, 50.801646842455575],
	[17.942750015625357, 50.80359244371713],
	[17.92185359147328, 50.804243084163694],
].map(([lon, lat]) => [lat, lon]) // lon/lat → lat/lon

const formatAddress = address => {
	const { road, house_number, postcode, city, town, village, suburb } = address
	const cityName = city || town || village || ''
	return [road, house_number, suburb, cityName, postcode]
		.filter(Boolean)
		.join(', ')
}

const isInsideAllowedArea = (lat, lon) => {
	const x = lat,
		y = lon
	let inside = false
	for (let i = 0, j = allowedArea.length - 1; i < allowedArea.length; j = i++) {
		const xi = allowedArea[i][0],
			yi = allowedArea[i][1]
		const xj = allowedArea[j][0],
			yj = allowedArea[j][1]
		const intersect =
			yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
		if (intersect) inside = !inside
	}
	return inside
}

const AddressInput = ({
	value,
	onChange,
	onBlur,
	error,
	location,
	setLocation,
}) => {
	const [address, setAddress] = useState(value || '')
	const [suggestions, setSuggestions] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const [showMap, setShowMap] = useState(false)
	const [selectedLocation, setSelectedLocation] = useState(location || null)
	const [confirmAddressVisible, setConfirmAddressVisible] = useState(false)

	const inputRef = useRef(null)

	useEffect(() => {
		setAddress(value || '')
	}, [value])

	const debouncedFetchSuggestions = useRef(
		debounce(async query => {
			if (!query) return
			try {
				setIsLoading(true)
				const { data } = await axios.get(
					'https://nominatim.openstreetmap.org/search',
					{
						params: {
							format: 'json',
							q: query,
							limit: 10,
							countrycodes: 'pl',
							bounded: 1,
							viewbox: '17.646853,50.51482,18.227175,50.824406',
							addressdetails: 1,
							'accept-language': 'pl',
						},
					}
				)

				const seen = new Set()
				const filtered = data.filter(item => {
					const formatted = formatAddress(item.address)
					if (seen.has(formatted)) return false
					seen.add(formatted)
					return true
				})

				setSuggestions(filtered)
			} catch (error) {
				console.error('Ошибка подсказок:', error)
			} finally {
				setIsLoading(false)
			}
		}, 1000)
	).current

	const wasClickedSuggestionRef = useRef(false)

	const handleSelectAddress = item => {
		const formatted = formatAddress(item.address)
		setAddress(formatted)
		onChange(formatted)
		setSuggestions([])
		setConfirmAddressVisible(false)

		const { lat, lon } = item
		setLocation({ lat, lon })
		setSelectedLocation([parseFloat(lat), parseFloat(lon)])
	}

	const handleBlurAddress = async () => {
		if (wasClickedSuggestionRef.current) {
			// сбросим флаг и выйдем — клик был, ничего не делать
			wasClickedSuggestionRef.current = false
			return
		}

		if (!address) return
		onBlur?.()

		try {
			const { data } = await axios.get(
				'https://nominatim.openstreetmap.org/search',
				{
					params: {
						format: 'json',
						q: address,
						limit: 10,
						countrycodes: 'pl',
						bounded: 1,
						viewbox: '17.646853,50.51482,18.227175,50.824406',
						addressdetails: 1,
						'accept-language': 'pl',
					},
				}
			)

			if (data.length === 1) {
				handleSelectAddress(data[0])
			} else if (data.length > 1) {
				setSuggestions(data)
				setConfirmAddressVisible(true)
			}
		} catch (error) {
			console.error('Ошибка поиска адреса:', error)
		}
	}

	useEffect(() => {
		const handleClickOutside = e => {
			if (inputRef.current && !inputRef.current.contains(e.target)) {
				setSuggestions([])
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	return (
		<div className='relative' ref={inputRef}>
			<Input
				value={address}
				type='address'
				autoComplete='address'
				onChange={e => {
					setAddress(e.target.value)
					onChange(e.target.value)
					debouncedFetchSuggestions(e.target.value)
				}}
				onBlur={() => {
					handleBlurAddress()
				}}
				placeholder='Wprowadź adres...'
				suffix={
					<button type='button' onClick={() => setShowMap(true)}>
						<MapLocationIcon className='w-8 h-8 stroke-accent-blue' />
					</button>
				}
			/>

			{error && <p className='text-red-500 text-sm mt-1'>{error.message}</p>}

			{isLoading && <div className='text-sm mt-1'>Szukam adresów...</div>}

			{suggestions.length > 0 && !confirmAddressVisible && (
				<ul className='absolute z-50 w-full bg-primary-blue border mt-1 shadow rounded-md max-h-48 overflow-y-auto scrollbar'>
					{suggestions.map(item => (
						<li
							key={item.place_id}
							className='p-2 hover:bg-gray-100 hover:text-accent-blue cursor-pointer'
							onMouseDown={() => {
								wasClickedSuggestionRef.current = true
							}}
							onClick={() => {
								handleSelectAddress(item)
							}}
						>
							{formatAddress(item.address)}
						</li>
					))}
				</ul>
			)}

			<Modal visible={showMap} onClose={() => setShowMap(false)}>
				<MapClient
					center={[50.7, 17.99]}
					zoom={12}
					selectedLocation={selectedLocation}
					allowedArea={allowedArea}
					setSelectedLocation={setSelectedLocation}
					setAddress={setAddress}
					onChange={onChange}
					closeModal={() => setShowMap(false)}
					setLocation={setLocation}
				/>
			</Modal>

			<Modal
				visible={confirmAddressVisible}
				onClose={() => setConfirmAddressVisible(false)}
			>
				<h2 className='text-lg font-semibold text-accent-blue mb-4'>
					Wybierz dokładny adres:
				</h2>
				<ul className='space-y-2'>
					{suggestions.map(item => (
						<li
							key={item.place_id}
							className='p-2 bg-blue-600 hover:bg-blue-700 rounded cursor-pointer'
							onClick={() => handleSelectAddress(item)}
						>
							{formatAddress(item.address)}
						</li>
					))}
				</ul>
			</Modal>
		</div>
	)
}

export default AddressInput

const MapClickHandler = ({
	setSelectedLocation,
	setAddress,
	onChange,
	closeModal,
	setLocation,
}) => {
	const map = useMap()

	useMapEvents({
		click: async e => {
			const { lat, lng } = e.latlng
			setSelectedLocation([lat, lng])
			setLocation({ lat, lng })

			try {
				const res = await fetch(
					`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pl&addressdetails=1`
				)
				const data = await res.json()
				if (data?.address) {
					const formatted = formatAddress(data.address)
					setAddress(formatted)
					onChange(formatted)
				}
				closeModal()
			} catch (error) {
				console.error('Ошибка обратного геокодинга:', error)
			}
		},
	})

	useEffect(() => {
		map.invalidateSize()
	}, [map])

	return null
}

const FitPolygon = ({ positions }) => {
	const map = useMap()

	useEffect(() => {
		if (positions.length) {
			map.fitBounds(positions)
		}
	}, [map, positions])

	return null
}
