import { forwardRef } from 'react'

const TextArea = forwardRef(
	(
		{
			value,
			onChange,
			placeholder = '',
			disabled = false,
			autoSize = false,
			resize = 'none',
			className = '',
			maxLength,
			rows = 3,
			...rest // Позволяет передавать `register` из `react-hook-form`
		},
		ref
	) => {
		const handleChange = e => {
			if (maxLength && e.target.value.length > maxLength) return // Ограничение по длине
			onChange?.(e) // Вызываем `onChange` напрямую
		}

		return (
			<div className={`relative ${className}`}>
				<textarea
					ref={ref}
					className={`w-full bg-transparent border border-white rounded-xl md:rounded-3xl px-3 py-4 md:px-6 md:py-4 font-semibold transition focus:border-white focus:ring-2 focus:ring-white ${
						disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
					}`}
					value={value} // 🔹 Значение теперь **только из `props`**
					onChange={handleChange}
					placeholder={placeholder}
					disabled={disabled}
					rows={rows}
					style={{
						resize,
						height: autoSize
							? `${Math.max(50, value?.split('\n').length * 20)}px`
							: 'auto',
					}}
					{...rest}
				/>
				{maxLength && (
					<span className='absolute bottom-2 right-4 text-gray-400 text-sm'>
						{value?.length || 0}/{maxLength}
					</span>
				)}
			</div>
		)
	}
)

export default TextArea
