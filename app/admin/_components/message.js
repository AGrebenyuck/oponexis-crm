'use client'

import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'

function getContainer() {
	if (typeof window === 'undefined') return null

	let container = document.getElementById('message-container')
	if (!container) {
		container = document.createElement('div')
		container.id = 'message-container'
		container.className =
			'fixed left-1/2 top-6 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2'
		document.body.appendChild(container)
	}

	return container
}

function Message({ type = 'info', content, duration = 3, onClose }) {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose()
		}, duration * 1000)
		return () => clearTimeout(timer)
	}, [duration, onClose])

	const typeStyles = {
		success: 'border-green-500 bg-green-50 text-green-900',
		error: 'border-red-500 bg-red-50 text-red-900',
		warning: 'border-yellow-500 bg-yellow-50 text-yellow-900',
		info: 'border-[#2c70b7] bg-blue-50 text-[#132c43]',
	}

	return (
		<div
			className={`rounded-md border-l-4 px-4 py-3 text-sm font-semibold shadow-lg ${
				typeStyles[type] || typeStyles.info
			}`}
		>
			{content}
		</div>
	)
}

const message = {
	show(type, content, duration = 3) {
		const container = getContainer()
		if (!container) return

		const mount = document.createElement('div')
		container.appendChild(mount)

		const root = createRoot(mount)
		const close = () => {
			root.unmount()
			mount.remove()
		}

		root.render(
			<Message
				type={type}
				content={content}
				duration={duration}
				onClose={close}
			/>
		)
	},
	success(content, duration) {
		this.show('success', content, duration)
	},
	error(content, duration) {
		this.show('error', content, duration)
	},
	warning(content, duration) {
		this.show('warning', content, duration)
	},
	info(content, duration) {
		this.show('info', content, duration)
	},
}

export default message
