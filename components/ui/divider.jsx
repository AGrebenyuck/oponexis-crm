import React from 'react'
import clsx from 'clsx'

const Divider = ({ type = 'horizontal', text, dashed = false }) => {
	return (
		<div
			className={clsx(
				'relative flex items-center',
				type === 'vertical' ? 'h-full w-px mx-2' : 'my-4'
			)}
		>
			{type === 'horizontal' ? (
				<div
					className={clsx(
						'w-full border-t',
						dashed ? 'border-dashed' : 'border-solid'
					)}
				></div>
			) : (
				<div
					className={clsx(
						'h-full border-l',
						dashed ? 'border-dashed' : 'border-solid'
					)}
				></div>
			)}
			{text && type === 'horizontal' && (
				<span className='absolute left-1/2 transform -translate-x-1/2 bg-white px-2 text-gray-600'>
					{text}
				</span>
			)}
		</div>
	)
}

export default Divider
