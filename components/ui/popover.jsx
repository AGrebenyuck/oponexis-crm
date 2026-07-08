// components/ui/Popover.jsx
'use client'

import {
	autoUpdate,
	flip,
	arrow as floatingArrow,
	offset,
	shift,
	useFloating,
} from '@floating-ui/react-dom'
import clsx from 'clsx'
import React, {
	cloneElement,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'

export default function Popover({
	children,
	content,
	trigger = 'click', // 'click' | 'hover' | 'focus'
	placement = 'top',
	open: controlledOpen,
	onOpenChange,
	confirm = false,
	title,
	description,
	onConfirm,
	onCancel,
	okText = 'OK',
	cancelText = 'Cancel',
	arrow = true,
	className = '',
	zIndex = 130, // перекрываем слайдер/хедер
}) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
	const isControlled = controlledOpen !== undefined
	const isOpen = isControlled ? controlledOpen : uncontrolledOpen

	const arrowRef = useRef(null)
	const labelId = useId()

	const {
		refs,
		floatingStyles,
		placement: actualPlacement,
		middlewareData,
	} = useFloating({
		open: isOpen,
		onOpenChange: open => {
			if (!isControlled) setUncontrolledOpen(open)
			onOpenChange?.(open)
		},
		middleware: [
			offset(10),
			flip(),
			shift(),
			floatingArrow({ element: arrowRef }),
		],
		placement,
		whileElementsMounted: autoUpdate,
	})

	const show = () => {
		if (!isControlled) setUncontrolledOpen(true)
		onOpenChange?.(true)
	}
	const hide = () => {
		if (!isControlled) setUncontrolledOpen(false)
		onOpenChange?.(false)
	}
	const toggle = () => {
		if (!isControlled) setUncontrolledOpen(v => !v)
		onOpenChange?.(!isOpen)
	}

	const handleOutside = useCallback(
		e => {
			if (
				refs.floating.current &&
				!refs.floating.current.contains(e.target) &&
				refs.reference.current &&
				!refs.reference.current.contains(e.target)
			)
				hide()
		},
		[refs.floating, refs.reference]
	)

	useEffect(() => {
		if (!isOpen) return
		document.addEventListener('mousedown', handleOutside)
		document.addEventListener('touchstart', handleOutside, { passive: true })
		const onEsc = e => e.key === 'Escape' && hide()
		window.addEventListener('keydown', onEsc)
		return () => {
			document.removeEventListener('mousedown', handleOutside)
			document.removeEventListener('touchstart', handleOutside)
			window.removeEventListener('keydown', onEsc)
		}
	}, [isOpen, handleOutside])

	// триггер
	const child = React.Children.only(children)
	const triggerProps = {
		ref: refs.setReference,
		'aria-haspopup': 'dialog',
		'aria-expanded': isOpen ? 'true' : 'false',
		'aria-controls': isOpen ? labelId : undefined,
	}
	if (trigger === 'click') triggerProps.onClick = toggle
	else if (trigger === 'hover') {
		triggerProps.onMouseEnter = show
		triggerProps.onMouseLeave = hide
	} else if (trigger === 'focus') {
		triggerProps.onFocus = show
		triggerProps.onBlur = hide
	}

	const staticSide = {
		top: 'bottom',
		right: 'left',
		bottom: 'top',
		left: 'right',
	}[actualPlacement.split('-')[0]]

	const bodyReady = typeof document !== 'undefined'

	return (
		<>
			{cloneElement(child, triggerProps)}

			{isOpen &&
				bodyReady &&
				createPortal(
					<div
						ref={refs.setFloating}
						role='dialog'
						aria-labelledby={labelId}
						style={{ ...floatingStyles, zIndex }}
						className={clsx(
							// карточка в твоём стиле
							'absolute rounded-2xl bg-[#0E1B28] text-white border border-white/10 shadow-2xl p-0', // p-0: обертка сама держит паддинги
							className
						)}
					>
						{/* Стрелка — ПОД контентом */}
						{arrow && (
							<div
								ref={arrowRef}
								className='absolute w-3 h-3 bg-[#0E1B28] border-t border-l border-[#0E1B28] pointer-events-none z-0 rotate-45'
								style={{
									left:
										middlewareData.arrow?.x != null
											? `${middlewareData.arrow.x}px`
											: '',
									top:
										middlewareData.arrow?.y != null
											? `${middlewareData.arrow.y}px`
											: '',
									[staticSide]: '-6px',
								}}
							/>
						)}

						{/* Контент поверх стрелки */}
						<div className='relative z-10 p-3 sm:p-4 text-sm max-w-72'>
							{confirm ? (
								<>
									<div id={labelId} className='font-semibold mb-1'>
										{title}
									</div>
									{description && (
										<div className='text-white/80 mb-3'>{description}</div>
									)}
									<div className='flex justify-end gap-2'>
										<button
											className='px-3 py-1 rounded bg-white/10 hover:bg-white/15'
											onClick={() => {
												onCancel?.()
												hide()
											}}
										>
											{cancelText}
										</button>
										<button
											className='px-3 py-1 rounded bg-accent-blue text-white hover:brightness-110'
											onClick={() => {
												onConfirm?.()
												hide()
											}}
										>
											{okText}
										</button>
									</div>
								</>
							) : (
								<div id={labelId}>{content}</div>
							)}
						</div>
					</div>,
					document.body
				)}
		</>
	)
}
