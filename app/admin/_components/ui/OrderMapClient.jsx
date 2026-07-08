'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

const DEFAULT_CENTER = { lat: 50.675, lng: 17.92 }

export default function OrderMapClient({ onSelect, initialCoords }) {
	const [pos, setPos] = useState(initialCoords || DEFAULT_CENTER)
	const [customIcon, setCustomIcon] = useState(null)

	useEffect(() => {
		import('leaflet').then(L => {
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
			center={[pos.lat, pos.lng]}
			zoom={13}
			scrollWheelZoom
			style={{ width: '100%', height: '100%' }}
		>
			<TileLayer
				url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
				attribution='&copy; OpenStreetMap'
			/>
			<MapClick onSelect={onSelect} setPos={setPos} />
			{customIcon ? <Marker position={[pos.lat, pos.lng]} icon={customIcon} /> : null}
		</MapContainer>
	)
}

function MapClick({ onSelect, setPos }) {
	useMapEvents({
		async click(event) {
			const { lat, lng } = event.latlng
			setPos({ lat, lng })

			try {
				const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pl&addressdetails=1`
				const res = await fetch(url)
				const data = await res.json()
				const address = formatAddress(data.address)

				onSelect?.({
					lat,
					lng,
					address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
				})
			} catch {
				onSelect?.({
					lat,
					lng,
					address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
				})
			}
		},
	})
	return null
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
