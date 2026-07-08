// components/ui/select.jsx
import {
	Children,
	cloneElement,
	forwardRef,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { SelectArrowDown, SelectArrowUp } from '../Icons'

const DESKTOP_MIN_MENU = 420 // можно поменять
const DESKTOP_MAX_MENU = 700 // можно поменять
const DESKTOP_BREAKPOINT = 1024 // lg

const Select = forwardRef(
	(
		{
			children,
			placeholder = 'Wybierz...',
			onChange,
			value,
			defaultValue = null,
			multiple = false,
			position = 'bottom', // 'top' | 'bottom'
			triggerClassName = '',
		},
		ref
	) => {
		const [selected, setSelected] = useState(
			value ?? defaultValue ?? (multiple ? [] : '')
		)
		const [open, setOpen] = useState(false)
		const [optionMetaMap, setOptionMetaMap] = useState({})
		const selectRef = useRef(null)
		const menuRef = useRef(null)
		const [menuStyle, setMenuStyle] = useState({}) // динамическая ширина

		useEffect(() => {
			const handleClickOutside = e => {
				if (
					selectRef.current &&
					!selectRef.current.contains(e.target) &&
					!menuRef.current?.contains(e.target)
				) {
					setOpen(false)
				}
			}
			document.addEventListener('mousedown', handleClickOutside)
			return () => document.removeEventListener('mousedown', handleClickOutside)
		}, [])

		useEffect(() => {
			if (value !== undefined) setSelected(value)
		}, [value])

		useLayoutEffect(() => {
			const map = {}
			Children.forEach(children, child => {
				if (!child?.props?.value) return
				const v = child.props.value
				const label = extractLabel(child.props.children)
				const subOptions = child.props.subOptions || []
				map[v] = { label, subOptions }
				subOptions.forEach(sub => {
					map[sub.value] = { label: sub.label, parent: v }
				})
			})
			setOptionMetaMap(map)
		}, [children])

		// пересчёт ширины и позиционирования меню на open/resize/scroll
		useEffect(() => {
			function calcMenuBox() {
				if (!open || !selectRef.current) return

				const trigger = selectRef.current.getBoundingClientRect()
				const viewportW = window.innerWidth
				const margin = 8 // отступ от краёв экрана

				// ширина
				const freeRight = Math.max(0, viewportW - trigger.left - margin)
				let width = trigger.width
				if (viewportW >= DESKTOP_BREAKPOINT) {
					width = Math.min(
						Math.max(trigger.width, DESKTOP_MIN_MENU),
						Math.min(DESKTOP_MAX_MENU, freeRight)
					)
				}
				width = Math.max(220, width) // страховка

				// позиция по X (внутри обёртки селекта): центр относительно триггера
				// базово ставим так, чтобы центр меню совпал с центром триггера
				let left = Math.round((trigger.width - width) / 2)

				// кламп: чтобы меню не выходило за экран
				// абсолютная позиция меню в вьюпорте = trigger.left + left
				const minLeft = margin - trigger.left // не дальше левого края
				const maxLeft = viewportW - margin - (trigger.left + width) // не дальше правого края
				left = Math.min(Math.max(left, minLeft), maxLeft)

				// на мобильных — фиксированно по триггеру
				if (viewportW < DESKTOP_BREAKPOINT) {
					width = trigger.width
					left = 0
				}

				setMenuStyle({ width: `${width}px`, left: `${left}px` })
			}

			calcMenuBox()
			const r = () => calcMenuBox()
			if (open) {
				window.addEventListener('resize', r)
				window.addEventListener('scroll', r, true)
			}
			return () => {
				window.removeEventListener('resize', r)
				window.removeEventListener('scroll', r, true)
			}
		}, [open])

		const handleSelect = (selectedValue, isSub = false) => {
			if (multiple) {
				let next = Array.isArray(selected) ? [...selected] : []
				const exists = next.includes(selectedValue)

				if (exists) {
					next = next.filter(v => v !== selectedValue)
					if (!isSub && optionMetaMap[selectedValue]?.subOptions?.length > 0) {
						const subs = optionMetaMap[selectedValue].subOptions.map(
							s => s.value
						)
						next = next.filter(v => !subs.includes(v))
					}
				} else {
					next.push(selectedValue)
				}
				setSelected(next)
				onChange?.(next)
			} else {
				const v = selected === selectedValue ? null : selectedValue
				setSelected(v)
				onChange?.(v)
				setOpen(false)
			}
		}

		const handleRemove = valueToRemove => {
			const subs =
				optionMetaMap[valueToRemove]?.subOptions?.map(s => s.value) || []
			const next = (Array.isArray(selected) ? selected : []).filter(
				v => v !== valueToRemove && !subs.includes(v)
			)
			setSelected(next)
			onChange?.(next)
		}

		const renderGroupedTags = () => {
			const groups = {}
			;(Array.isArray(selected) ? selected : []).forEach(val => {
				const meta = optionMetaMap[val]
				if (!meta) return
				const parent = meta.parent || val
				if (!groups[parent]) {
					groups[parent] = {
						label: optionMetaMap[parent]?.label,
						subs: [],
						hasParent: !!meta.parent,
					}
				}
				if (meta.parent)
					groups[parent].subs.push({ label: meta.label, value: val })
			})

			return Object.entries(groups).flatMap(([key, group]) => {
				const tags = []
				// Родительский тег — ПОЛНОЕ название, без обрезания
				tags.push(
					<span
						key={key}
						title={group.label || ''} // тултип с полным названием
						className='bg-white/15 text-white px-2 py-1 text-xs rounded-lg flex items-center mr-1 mb-1 whitespace-normal break-words'
					>
						<span>{group.label}</span>
						<span
							role='button'
							tabIndex={0}
							className='ml-1 text-white/70 hover:text-white cursor-pointer select-none'
							onClick={e => {
								e.stopPropagation()
								handleRemove(key)
							}}
							onKeyDown={e => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									handleRemove(key)
								}
							}}
							aria-label='Usuń'
						>
							✕
						</span>
					</span>
				)
				// Теги детей — тоже без обрезания
				group.subs.forEach(sub => {
					tags.push(
						<span
							key={sub.value}
							title={sub.label || ''}
							className='bg-white/10 text-white/90 px-2 py-1 text-[11px] rounded-md flex items-center mr-1 mb-1 whitespace-normal break-words'
						>
							<span>{sub.label}</span>
							<span
								role='button'
								tabIndex={0}
								className='ml-1 text-white/70 hover:text-white cursor-pointer select-none'
								onClick={e => {
									e.stopPropagation()
									handleRemove(sub.value)
								}}
								onKeyDown={e => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault()
										handleRemove(sub.value)
									}
								}}
								aria-label='Usuń'
							>
								✕
							</span>
						</span>
					)
				})
				return tags
			})
		}

		const menuPosClass =
			position === 'top' ? 'bottom-full mb-1' : 'top-[105%] mt-1'

		return (
			<div ref={selectRef} className='relative inline-block w-full'>
				{/* Триггер — div role=button */}
				<div
					ref={ref}
					role='button'
					tabIndex={0}
					onClick={() => setOpen(!open)}
					onKeyDown={e => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault()
							setOpen(!open)
						}
					}}
					className={`
						w-full
						flex items-center justify-between       /* <— выравниваем по верху */
						rounded-xl bg-white/10 border border-white/30
						px-3 pt-2 pb-2                         /* <— паддинги вместо фикс. высоты */
						font-semibold text-left text-white placeholder-white/50
						outline-none focus:outline-none focus:ring-2 focus:ring-white/40
						${triggerClassName || ''}
					`}
				>
					<div className='min-h-[1.5rem] flex flex-wrap gap-1 grow'>
						{multiple ? (
							Array.isArray(selected) && selected.length > 0 ? (
								renderGroupedTags()
							) : (
								<span className='text-white/50'>{placeholder}</span>
							)
						) : (
							<span className={selected ? '' : 'text-white/50'}>
								{optionMetaMap[selected]?.label || placeholder}
							</span>
						)}
					</div>
					<span className='ml-2 shrink-0 opacity-80'>
						{open ? <SelectArrowUp /> : <SelectArrowDown />}
					</span>
				</div>

				{/* Меню — более плотное, с динамической шириной на десктопе */}
				{open && (
					<div
						ref={menuRef}
						style={menuStyle}
						className={`
              absolute z-50 ${menuPosClass} custom-select-menu
              rounded-xl border border-white/40 bg-primary-blue/95
              backdrop-blur-md shadow-xl p-1 ring-1 ring-white/30
              max-h-[320px] overflow-y-scroll
            `}
					>
						<div className='py-1'>
							{Children.map(children, child =>
								cloneElement(child, {
									onSelect: handleSelect,
									selected,
									multiple,
								})
							)}
						</div>
					</div>
				)}
			</div>
		)
	}
)

function extractLabel(labelNode) {
	if (typeof labelNode === 'string') return labelNode
	if (Array.isArray(labelNode))
		return labelNode.find(c => typeof c === 'string') || ''
	if (labelNode?.props?.children) {
		const children = labelNode.props.children
		if (typeof children === 'string') return children
		if (Array.isArray(children))
			return children.find(c => typeof c === 'string') || ''
	}
	return ''
}

export const SelectOption = ({
	children,
	value,
	onSelect,
	selected,
	multiple,
	subOptions = [],
}) => {
	const isSelected = Array.isArray(selected)
		? selected.includes(value)
		: selected === value

	const handleClick = () => onSelect(value, false)
	const handleSubSelect = subVal => onSelect(subVal, true)

	// для тултипа возьмём первый «сырой» текст — это название
	const parentLabel = Array.isArray(children) ? children[0] : children

	return (
		<div className='w-full'>
			{/* Родитель */}
			<button
				type='button'
				onClick={handleClick}
				title={typeof parentLabel === 'string' ? parentLabel : undefined}
				className={`
          w-full flex items-center gap-2 rounded-lg px-3 py-2
          text-left transition-colors whitespace-nowrap
          ${
						isSelected
							? 'bg-white/18 text-white'
							: 'text-white hover:bg-white/12'
					}
        `}
			>
				{multiple && (
					<span
						className={`
              inline-flex h-4 w-4 items-center justify-center rounded-[6px] border
              ${
								isSelected
									? 'border-white bg-white/90'
									: 'border-white/40 bg-transparent'
							}
            `}
						aria-hidden
					>
						{isSelected ? (
							<svg viewBox='0 0 20 20' className='h-3 w-3 text-primary-blue'>
								<path
									d='M7.6 13.2L4.4 10l-1 1 4.2 4.2L17 5.8l-1-1z'
									fill='currentColor'
								/>
							</svg>
						) : null}
					</span>
				)}
				<span className='flex-1 flex items-center gap-2 min-w-0'>
					<span className='truncate'>{parentLabel}</span>
					{Array.isArray(children) ? children.slice(1) : null}
				</span>
			</button>

			{/* Подопции */}
			{subOptions.length > 0 && (
				<div className='ml-8 mt-1 mb-1 flex flex-col gap-1'>
					{subOptions.map((sub, i) => {
						const subSel =
							Array.isArray(selected) && selected.includes(sub.value)
						return (
							<button
								key={sub.value || i}
								type='button'
								title={sub.label}
								className={`
                  w-full flex items-center gap-2 rounded-md px-3 py-2
                  ${
										subSel
											? 'bg-white/14 text-white'
											: 'text-white/90 hover:bg-white/10'
									}
                `}
								onClick={e => {
									e.preventDefault()
									e.stopPropagation()
									handleSubSelect(sub.value)
								}}
							>
								{multiple && (
									<span
										className={`
                      inline-flex h-4 w-4 items-center justify-center rounded-[6px] border
                      ${
												subSel
													? 'border-white bg-white/90'
													: 'border-white/40 bg-transparent'
											}
                    `}
										aria-hidden
									>
										{subSel ? (
											<svg
												viewBox='0 0 20 20'
												className='h-3 w-3 text-primary-blue'
											>
												<path
													d='M7.6 13.2L4.4 10l-1 1 4.2 4.2L17 5.8l-1-1z'
													fill='currentColor'
												/>
											</svg>
										) : null}
									</span>
								)}
								<span className='flex-1 min-w-0 flex items-center gap-2'>
									<span className='truncate'>{sub.label}</span>
									<span className='ml-auto text-white/85 text-sm shrink-0 whitespace-nowrap'>
										{sub.price} zł
									</span>
								</span>
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}

export default Select
