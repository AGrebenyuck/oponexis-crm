'use client'

import { PlusOutlined } from '@ant-design/icons'
import classNames from 'classnames'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export default function FloatButton({
	type = 'default',
	icon = <PlusOutlined />,
	tooltip = '',
	onClick,
	menu = [],
	shape = 'circle',
	position = { bottom: 24, right: 24 },
	zIndex = 1000,
	className = '',
	style = {},
}) {
	const [open, setOpen] = useState(false)
	const ref = useRef(null)

	const handleToggle = () => {
		if (menu.length) {
			setOpen(prev => !prev)
		} else {
			onClick?.()
		}
	}

	// Закрытие при клике вне
	useEffect(() => {
		const handleClickOutside = e => {
			if (ref.current && !ref.current.contains(e.target)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	return (
		<div
			ref={ref}
			className={classNames(
				'fixed',
				className,
				'z-[var(--z-index)]',
				'flex flex-col items-end gap-2'
			)}
			style={{
				...style,
				...position,
				zIndex,
			}}
		>
			<AnimatePresence>
				{open &&
					menu.map((item, index) => (
						<motion.button
							key={index}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
							transition={{ duration: 0.2 }}
							className={classNames(
								'flex items-center gap-2 px-4 py-2 rounded-full shadow-md bg-white text-gray-800 text-sm hover:shadow-lg transition-all',
								item.className
							)}
							onClick={() => {
								item.onClick?.()
								setOpen(false)
							}}
							title={item.tooltip}
						>
							{item.icon && <span className='text-lg'>{item.icon}</span>}
							{item.label && (
								<span className='whitespace-nowrap'>{item.label}</span>
							)}
						</motion.button>
					))}
			</AnimatePresence>

			<button
				className={classNames(
					'w-14 h-14 flex items-center justify-center transition-all shadow-lg',
					shape === 'circle' ? 'rounded-full' : 'rounded-md',
					type === 'primary' ? 'bg-blue-600 text-white' : 'bg-white text-black'
				)}
				onClick={handleToggle}
				title={tooltip}
			>
				{icon}
			</button>
		</div>
	)
}
