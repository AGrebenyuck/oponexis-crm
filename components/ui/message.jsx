import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

// Функция для создания контейнера
const messageContainer = (() => {
	if (typeof window === 'undefined') return null
	let container = document.getElementById('message-container')
	if (!container) {
		container = document.createElement('div')
		container.id = 'message-container'
		container.className =
			'fixed top-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-2 z-50'
		document.body.appendChild(container)
	}
	return container
})()

const Message = ({ type = 'info', content, duration = 3, onClose }) => {
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		setVisible(true)
		const timer = setTimeout(() => {
			setVisible(false)
			setTimeout(onClose, 300)
		}, duration * 1000)
		return () => clearTimeout(timer)
	}, [duration, onClose])

	if (!visible) return null

	const typeStyles = {
		success: 'bg-green-100 text-green-800 border-green-400',
		error: 'bg-red-100 text-red-800 border-red-400',
		warning: 'bg-yellow-100 text-yellow-800 border-yellow-400',
		info: 'bg-blue-100 text-blue-800 border-blue-400',
	}

	return (
		<div
			className={clsx(
				'p-4 border-l-4 shadow-md rounded-md transition-transform duration-300',
				'transform translate-y-[-100%] opacity-0 animate-fadeSlideIn',
				typeStyles[type]
			)}
		>
			{content}
		</div>
	)
}

// API для вызова сообщений
const message = {
	show: (type, content, duration = 3) => {
		const container = document.createElement('div')
		messageContainer.appendChild(container)

		const root = createRoot(container)
		const close = () => {
			root.unmount()
			messageContainer.removeChild(container)
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
	success: (content, duration) => message.show('success', content, duration),
	error: (content, duration) => message.show('error', content, duration),
	warning: (content, duration) => message.show('warning', content, duration),
	info: (content, duration) => message.show('info', content, duration),
}

export default message
