// components/ui/OrderMapClient.jsx
'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

export default function OrderMapClient({ onSelect, initialCoords }) {
	const [pos, setPos] = useState(initialCoords)
	const [customIcon, setCustomIcon] = useState(null)

	useEffect(() => {
		// импортируем Leaflet только на клиенте
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

	function MapClick() {
		useMapEvents({
			async click(e) {
				const { lat, lng } = e.latlng
				setPos({ lat, lng })

				try {
					const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pl&addressdetails=1`
					const res = await fetch(url)
					const data = await res.json()
					const address = formatAddress(data.address)

					onSelect({
						lat,
						lng,
						address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
					})
				} catch (err) {
					console.error('reverse geocode failed', err)
					onSelect({
						lat,
						lng,
						address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
					})
				}
			},
		})
		return null
	}

	return (
		<MapContainer
			center={pos ? [pos.lat, pos.lng] : [50.675, 17.92]}
			zoom={13}
			scrollWheelZoom={true}
			style={{ width: '100%', height: '100%' }}
		>
			<TileLayer
				url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
				attribution='&copy; OpenStreetMap'
			/>
			<MapClick />
			{pos && customIcon && (
				<Marker position={[pos.lat, pos.lng]} icon={customIcon} />
			)}
		</MapContainer>
	)
}

function formatAddress(add) {
	if (!add) return ''
	return [
		add.road,
		add.house_number,
		add.suburb,
		add.city || add.town || add.village,
		add.postcode,
	]
		.filter(Boolean)
		.join(', ')
}
