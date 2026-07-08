// components/ui/MultiServicePicker.jsx
'use client'

import Select, { SelectOption } from '@/components/ui/select'
import { useMemo } from 'react'

/**
 * Иерархический мультиселект:
 * - можно выбрать родителя и/или подопции
 * - выбор подопции добавляет родителя
 * - снятие родителя снимает всех подопций
 *
 * props:
 * - services: [{ id, name, price, additionalServices?: [{ id, name, price }] }]
 * - value: string[]
 * - onChange: (ids: string[]) => void
 * - placeholder?: string
 * - label?: string
 * - dropdownPosition?: 'top' | 'bottom'
 * - className?: string
 * - variant?: 'hero' | 'order'
 * - labelClassName?: string
 */
export default function MultiServicePicker({
	services = [],
	value = [],
	onChange,
	placeholder = 'Wybierz usługę…',
	label = 'Usługa',
	dropdownPosition = 'top',
	className = '',
	variant = 'hero',
	labelClassName = '',
}) {
	const maps = useMemo(() => {
		const childToParent = new Map()
		for (const s of services) {
			const pid = String(s.id ?? '')
			for (const sub of s.additionalServices || []) {
				childToParent.set(String(sub.id ?? ''), pid)
			}
		}
		return { childToParent }
	}, [services])

	function enforceRules(nextIdsRaw) {
		let next = Array.from(new Set((nextIdsRaw || []).map(String)))
		// (1) дочерний → добавить родителя
		for (const id of next) {
			const p = maps.childToParent.get(id)
			if (p && !next.includes(p)) next.push(p)
		}
		// (2) если родителя нет — дети снимаются
		const setNext = new Set(next)
		next = next.filter(id => {
			const p = maps.childToParent.get(id)
			return !p || setNext.has(p)
		})
		return Array.from(new Set(next))
	}

	const handleChange = nextIds => {
		onChange?.(enforceRules(nextIds))
	}

	const isOrder = variant === 'order'

	const wrapperClass = isOrder
		? '' // обычный инпут в форме заказа
		: 'rounded-xl bg-white/10 border border-white/30'

	const triggerClassName = isOrder
		? [
				'w-full',
				'min-h-[42px]', // важно: min-h вместо фиксированной h
				'rounded-lg',
				'bg-slate-800/80',
				'border border-slate-700',
				'text-sm text-slate-100',
				'px-3 py-2',
				'flex flex-wrap items-center gap-1', // чипы переносятся на новые строки
				'text-left',
		  ].join(' ')
		: 'min-h-[48px] md:min-h-[52px] py-0'

	const labelBaseClass = isOrder
		? 'block text-xs text-slate-400 mb-1'
		: 'block text-white/85 text-sm mb-1'

	return (
		<div className={`w-full ${className}`}>
			{label ? (
				<label className={`${labelBaseClass} ${labelClassName}`}>{label}</label>
			) : null}

			<div className={wrapperClass}>
				<Select
					multiple
					value={(value || []).map(String)}
					onChange={handleChange}
					placeholder={placeholder}
					position={dropdownPosition}
					triggerClassName={triggerClassName}
				>
					{services.map((s, idx) => {
						const pid = String(s.id ?? `svc-${idx}`)
						const subOptions = (s.additionalServices || []).map((sub, i) => ({
							value: String(sub.id ?? `${pid}-sub-${i}`),
							label: sub.name,
							price: sub.price,
						}))
						return (
							<SelectOption
								key={`svc-${pid}`}
								value={pid}
								subOptions={subOptions}
							>
								{String(s.name)}
								{typeof s.price !== 'undefined' && (
									<span className='ml-auto opacity-70 text-xs'>
										{s.price} zł
									</span>
								)}
							</SelectOption>
						)
					})}
				</Select>
			</div>
		</div>
	)
}
