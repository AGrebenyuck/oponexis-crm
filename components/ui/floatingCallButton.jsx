'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { motion } from 'framer-motion'

// Если у тебя есть константы — используй их:
import { LINKS, SITE } from '@/lib/site' // <- если нет, замени на свои
import FloatButton from './floatButton'

// Простейшая иконка-трубка (можешь заменить на свою)
function PhoneIcon({ className = '' }) {
	return (
		<svg
			viewBox='0 0 24 24'
			width='24'
			height='24'
			className={className}
			fill='currentColor'
			aria-hidden='true'
		>
			<path d='M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.56.57 1 1 0 011 1v3.61a1 1 0 01-1 1A16.78 16.78 0 013 5a1 1 0 011-1h3.61a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.02l-2.32 2.21z' />
		</svg>
	)
}

export default function FloatingCallButton({
	telHref = LINKS?.PHONE_TEL || 'tel:+48123456789',
	tooltip = 'Zadzwoń',
	appearDelayMs = 250, // чуть подождём после mount, чтобы избежать «мигания»
	animateEverySec = 4, // каждые N сек лёгкий «wiggle»
}) {
	const [visible, setVisible] = useState(false)
	const [mounted, setMounted] = useState(false)
	const heroInViewRef = useRef(true) // по умолчанию считаем, что на старте мы в Hero

	// Обработчик клика
	function callNow() {
		try {
			// GTM (если установлен)
			window.dataLayer = window.dataLayer || []
			window.dataLayer.push({
				event: 'call_click_float',
				phone: SITE?.PHONE_DISPLAY || null,
			})
		} catch {}
		// Переход в звонилку
		window.location.href = telHref
	}

	// Наблюдение за Hero через IntersectionObserver
	useEffect(() => {
		setMounted(true)
		const hero = document.querySelector('[data-hero]')
		if (!hero) {
			// Если по какой-то причине hero не нашли — всегда показываем кнопку (кроме самой Hero-страницы)
			const timer = setTimeout(() => setVisible(true), appearDelayMs)
			return () => clearTimeout(timer)
		}

		const io = new IntersectionObserver(
			entries => {
				const [entry] = entries
				const inView = !!entry?.isIntersecting
				heroInViewRef.current = inView
				// показываем кнопку, когда Hero не виден
				setVisible(!inView)
			},
			{
				root: null,
				threshold: 0.15, // считаем что «видно», если хотя бы 15% Hero в экране
			}
		)
		io.observe(hero)

		// fallback при первом монтировании — без мигания
		const timer = setTimeout(() => {
			if (!heroInViewRef.current) setVisible(true)
		}, appearDelayMs)

		return () => {
			io.disconnect()
			clearTimeout(timer)
		}
	}, [appearDelayMs])

	// Анимированная трубка (wiggle каждые animateEverySec сек)
	const AnimatedIcon = useMemo(() => {
		return (
			<motion.span
				aria-hidden='true'
				className='text-white'
				animate={{ rotate: [0, -15, 15, 0] }}
				transition={{
					duration: 0.6,
					repeat: Infinity,
					repeatDelay: animateEverySec,
				}}
			>
				<PhoneIcon />
			</motion.span>
		)
	}, [animateEverySec])

	// Скроем вообще до гидратации на клиенте
	if (!mounted) return null
	if (!visible) return null

	return (
		<FloatButton
			type='primary'
			tooltip={tooltip}
			icon={AnimatedIcon}
			onClick={callNow}
			position={{ bottom: 30, right: 30 }}
			zIndex={1100}
			className='shadow-xl rounded-full'
			// Можно подкрутить стили, чтобы вписаться в твой UI:
			style={{ boxShadow: '0 10px 24px rgba(0,0,0,0.22)' }}
		/>
	)
}
