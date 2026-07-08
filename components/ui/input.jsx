import { forwardRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { ErrorIcon } from '../Icons'
import Popover from './popover'

const Input = forwardRef(
	(
		{
			name,
			placeholder = '',
			disabled = false,
			prefix,
			suffix,
			type = 'text',
			className = '',
			error = null,
			...rest
		},
		ref
	) => {
		const hasError = error || null

		return (
			<div className='relative w-full'>
				<div
					className={`flex items-center border md:border-2 rounded-xl md:rounded-3xl px-3 py-4 md:px-6 md:py-4 font-semibold transition focus-within:ring-2 ${
						hasError
							? 'border-red-500 ring-red-500'
							: 'border-white focus-within:border-white focus-within:ring-white'
					} ${
						disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
					} ${className}`}
				>
					{prefix && <span className='ml-2 text-gray-500'>{prefix}</span>}

					<input
						ref={ref}
						name={name}
						type={type}
						className='flex-1 outline-none bg-transparent w-full'
						placeholder={placeholder}
						disabled={disabled}
						autoComplete='off'
						{...rest}
					/>

					{hasError ? (
						<Popover content={hasError.message}>
							<button
								type='button'
								onMouseDown={e => {
									e.preventDefault()
									e.stopPropagation()
								}}
							>
								<ErrorIcon className='w-5 h-5' />
							</button>
						</Popover>
					) : (
						suffix && <span className='ml-2 text-gray-500'>{suffix}</span>
					)}
				</div>
			</div>
		)
	}
)

export default Input
