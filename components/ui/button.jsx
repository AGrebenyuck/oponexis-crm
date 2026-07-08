import React from 'react'
import clsx from 'clsx'

const Button = ({
	type = 'button',
	children,
	onClick,
	disabled,
	loading,
	className,
}) => {
	const baseStyles =
		'inline-flex items-center justify-center font-semibold rounded-xl lg:rounded-3xl transition-all px-6 py-2 md:px-10 md:py-3 lg:px-18 lg:py-5'

	const typeStyles = {
		alternative:
			'text-white border border-white hover:bg-white hover:text-primary-blue',
		default: 'bg-white text-primary-blue hover:bg-gray-200',
		link: 'text-blue-600 underline hover:text-blue-800',
		danger: 'bg-red-600 text-white hover:bg-red-700',
	}

	return (
		<button
			type={type}
			className={clsx(
				baseStyles,
				typeStyles[type],
				'disabled:opacity-50 disabled:pointer-events-none',
				loading && 'opacity-50 pointer-events-none',
				className
			)}
			onClick={onClick}
			disabled={disabled || loading}
		>
			{loading && <span className='mr-2 animate-spin'>⏳</span>}
			{children}
		</button>
	)
}

export default Button
