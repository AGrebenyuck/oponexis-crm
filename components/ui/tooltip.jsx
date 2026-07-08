import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const Tooltip = ({ children, text, position = 'top', className = '' }) => {
	const [visible, setVisible] = useState(false)
	const [coords, setCoords] = useState(null)
	const parentRef = useRef(null)
	const tooltipRef = useRef(null)
	const timeoutRef = useRef(null)

	useEffect(() => {
		if (!parentRef.current) return

		const handleMouseEnter = () => {
			const rect = parentRef.current.getBoundingClientRect()
			setCoords({
				top: rect.top + window.scrollY,
				left: rect.left + window.scrollX,
				width: rect.width,
				height: rect.height,
			})

			timeoutRef.current = setTimeout(() => {
				setVisible(true)
			}, 200) // Задержка для предотвращения мерцания
		}

		const handleMouseLeave = () => {
			clearTimeout(timeoutRef.current)
			setTimeout(() => setVisible(false), 800)
		}

		const handleTouchStart = e => {
			e.stopPropagation()
			if (!visible) {
				handleMouseEnter()
			}
		}

		const handleClickOutside = e => {
			if (
				tooltipRef.current &&
				!tooltipRef.current.contains(e.target) &&
				parentRef.current &&
				!parentRef.current.contains(e.target)
			) {
				setVisible(false)
			}
		}

		document.addEventListener('touchstart', handleClickOutside)
		document.addEventListener('mousedown', handleClickOutside)

		const element = parentRef.current
		element.addEventListener('mouseenter', handleMouseEnter)
		element.addEventListener('mouseleave', handleMouseLeave)
		element.addEventListener('touchstart', handleTouchStart)

		return () => {
			if (element) {
				element.removeEventListener('mouseenter', handleMouseEnter)
				element.removeEventListener('mouseleave', handleMouseLeave)
				element.removeEventListener('touchstart', handleTouchStart)
			}
			document.removeEventListener('touchstart', handleClickOutside)
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [visible])

	const getTooltipPosition = () => {
		if (!coords) return { opacity: 0 }

		const styles = {
			position: 'absolute',
			transform: 'translateX(-50%)',
			zIndex: 50,
			whiteSpace: 'wrap',
			maxWidth: '100px',
			textAlign: 'center',
			opacity: visible ? 1 : 0,
			pointerEvents: 'none',
			transition: 'opacity 0.2s ease-in-out',
		}

		let top, left

		switch (position) {
			case 'top':
				top = coords.top - 35
				left = coords.left + coords.width / 2
				break
			case 'bottom':
				top = coords.top + coords.height + 10
				left = coords.left + coords.width / 2
				break
			case 'left':
				top = coords.top + coords.height / 2
				left = coords.left - 10
				break
			case 'right':
				top = coords.top + coords.height / 2
				left = coords.left + coords.width + 10
				break
			default:
				top = coords.top - 35
				left = coords.left + coords.width / 2
		}

		// Ограничение по границам экрана
		const padding = 10
		const tooltipWidth = 100
		if (left - tooltipWidth / 2 < padding) {
			left = tooltipWidth / 2 + padding
		}
		if (left + tooltipWidth / 2 > window.innerWidth - padding) {
			left = window.innerWidth - tooltipWidth / 2 - padding
		}
		if (top < padding) {
			top = coords.top + coords.height + 10 // Если не помещается сверху, показать снизу
		}
		if (top + 30 > window.innerHeight - padding) {
			top = coords.top - 35 // Если не помещается снизу, показать сверху
		}

		return { ...styles, top, left }
	}

	return (
		<span ref={parentRef} className='relative inline-block'>
			{children}
			{visible &&
				createPortal(
					<div
						ref={tooltipRef}
						className={`bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-md ${className}`}
						style={getTooltipPosition()}
					>
						{text}
					</div>,
					document.body
				)}
		</span>
	)
}

export default Tooltip
