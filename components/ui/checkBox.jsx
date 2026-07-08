import { forwardRef, useEffect, useState } from 'react'
import { CheckBoxCheckedIcon } from '../Icons'

const Checkbox = forwardRef(
	({ checked, onChange, disabled = false, label, className = '' }, ref) => {
		const [isChecked, setIsChecked] = useState(checked ?? false)

		useEffect(() => {
			if (checked !== undefined) {
				setIsChecked(checked)
			}
		}, [checked])

		const toggle = () => {
			if (disabled) return
			const newValue = !isChecked
			setIsChecked(newValue)
			onChange?.(newValue)
		}

		const handleKeyDown = e => {
			if (e.key === ' ' || e.key === 'Enter') {
				e.preventDefault()
				toggle()
			}
		}

		return (
			<div
				ref={ref}
				role='checkbox'
				aria-checked={isChecked}
				tabIndex={disabled ? -1 : 0}
				onClick={toggle}
				onKeyDown={handleKeyDown}
				className={`flex items-center gap-3 cursor-pointer  rounded ${
					disabled ? 'opacity-50 cursor-not-allowed' : ''
				} ${className}`}
			>
				<div
					className={`w-7 h-7 md:w-12 md:h-12 flex items-center shrink-0 justify-center border-2 focus:outline-none focus:ring-2 focus:ring-white rounded-full border-secondary-orange`}
				>
					{isChecked && (
						<CheckBoxCheckedIcon className='w-[16px] h-[11px] md:w-[29px] md:h-[21px]' />
					)}
				</div>
				{label && <span className='text-white font-semibold'>{label}</span>}
			</div>
		)
	}
)

export default Checkbox
