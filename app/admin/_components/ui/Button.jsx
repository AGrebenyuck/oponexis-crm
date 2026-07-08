'use client'

import Spin from './Spin'

const variants = {
	primary: 'opx-btn-primary',
	secondary: 'opx-btn-secondary',
	danger:
		'rounded-md border border-red-200 bg-white font-bold text-red-700 hover:bg-red-50',
	ghost:
		'rounded-md border border-white/20 bg-white/10 font-bold text-white hover:bg-white/15',
}

export default function Button({
	type = 'button',
	variant = 'primary',
	loading = false,
	disabled = false,
	className = '',
	children,
	...props
}) {
	return (
		<button
			type={type}
			disabled={disabled || loading}
			className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
				variants[variant] || variants.primary
			} ${className}`}
			{...props}
		>
			{loading ? <Spin size='small' /> : null}
			{children}
		</button>
	)
}
