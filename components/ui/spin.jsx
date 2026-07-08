import React from 'react'
import clsx from 'clsx'

const spinStyle = size => ({
	width: size,
	height: size,
	display: 'inline-block',
	border: '0.2em solid currentColor',
	borderRightColor: 'transparent',
	borderRadius: '50%',
	animation: 'spin 0.75s linear infinite',
})

const keyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`

const sizeMap = {
	small: '1em',
	default: '2em',
	large: '3em',
}

const Spin = ({ spinning = true, size = 'default', tip, children }) => {
	const sizeValue = sizeMap[size] || sizeMap.default

	// Только спиннер
	if (!children) {
		return (
			<div className='inline-flex flex-col items-center justify-center text-gray-600'>
				<style>{keyframes}</style>
				<div style={spinStyle(sizeValue)} />
				{tip && <div className='mt-1 text-sm'>{tip}</div>}
			</div>
		)
	}

	// Спиннер + обёртка
	return (
		<div className='relative'>
			<style>{keyframes}</style>

			{spinning && (
				<div className='absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm'>
					<div style={spinStyle(sizeValue)} />
					{tip && (
						<div className='mt-2 text-sm text-gray-600 absolute top-full'>
							{tip}
						</div>
					)}
				</div>
			)}

			<div className={clsx(spinning && 'opacity-30 pointer-events-none')}>
				{children}
			</div>
		</div>
	)
}

export default Spin
