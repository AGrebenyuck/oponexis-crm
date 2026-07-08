'use client'

import { useEffect, useState } from 'react'
import {
	MapContainer,
	Marker,
	Polygon,
	TileLayer,
	useMap,
	useMapEvents,
} from 'react-leaflet'

const MapClient = ({
	center,
	zoom = 12,
	selectedLocation,
	allowedArea,
	setSelectedLocation,
	setAddress,
	onChange,
	closeModal,
	setLocation,
}) => {
	const [customIcon, setCustomIcon] = useState(null)

	useEffect(() => {
		// 💡 Импортируем Leaflet только на клиенте
		import('leaflet').then(L => {
			L.Icon.Default.mergeOptions({
				iconRetinaUrl: '/leaflet/marker-icon-2x.png',
				iconUrl: '/marker-icon.svg',
				shadowUrl: '/leaflet/marker-shadow.png',
			})

			const icon = new L.Icon({
				iconUrl: '/marker-icon.svg',
				iconSize: [30, 45],
				iconAnchor: [15, 45],
				popupAnchor: [0, -45],
			})
			setCustomIcon(icon)
		})
	}, [])
	return (
		<MapContainer
			center={center}
			zoom={zoom}
			style={{ height: '400px', width: '100%' }}
		>
			<TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
			<Polygon positions={allowedArea} color='blue' />
			{selectedLocation && customIcon && (
				<Marker position={selectedLocation} icon={customIcon} />
			)}
			<FitPolygon positions={allowedArea} />
			<MapClickHandler
				setSelectedLocation={setSelectedLocation}
				setAddress={setAddress}
				onChange={onChange}
				closeModal={closeModal}
				setLocation={setLocation}
			/>
		</MapContainer>
	)
}

export default MapClient

const MapClickHandler = ({
	setSelectedLocation,
	setAddress,
	onChange,
	closeModal,
	setLocation,
}) => {
	const map = useMapEvents({
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
				console.error('Błąd geokodowania:', error)
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

const formatAddress = address => {
	const { road, house_number, postcode, city, town, village, suburb } = address
	const cityName = city || town || village || ''
	return [road, house_number, suburb, cityName, postcode]
		.filter(Boolean)
		.join(', ')
}
