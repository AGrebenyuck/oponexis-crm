import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'

const Truncating = ({
	text,
	maxLines = 3,
	tooltip = false,
	expandable = false,
	className,
}) => {
	const [expanded, setExpanded] = useState(false)
	const [shouldTruncate, setShouldTruncate] = useState(false)
	const textRef = useRef(null)

	useEffect(() => {
		if (textRef.current) {
			const lineHeight = parseFloat(
				window.getComputedStyle(textRef.current).lineHeight
			)
			const maxHeight = lineHeight * maxLines
			setShouldTruncate(textRef.current.scrollHeight > maxHeight)
		}
	}, [text, maxLines])

	return (
		<div
			className={clsx('relative cursor-pointer', className, tooltip && 'group')}
			onClick={() => expandable && setExpanded(!expanded)}
		>
			<p
				ref={textRef}
				className={clsx(
					'overflow-hidden',
					!expanded && shouldTruncate ? `line-clamp-${maxLines}` : ''
				)}
				style={
					!expanded && shouldTruncate
						? {
								display: '-webkit-box',
								WebkitLineClamp: maxLines,
								WebkitBoxOrient: 'vertical',
						  }
						: {}
				}
			>
				{text}
			</p>
			{tooltip && shouldTruncate && !expandable && (
				<span className='absolute left-0 top-full mt-1 hidden w-[inherit] h-auto bg-primary-blue text-white text-sm px-2 py-1 rounded shadow-lg group-hover:block'>
					{text}
				</span>
			)}
			{expandable && shouldTruncate && (
				<button
					className='text-accent-blue ml-1'
					onClick={() => setExpanded(!expanded)}
				>
					{expanded ? 'zwinąć' : 'Przeczytaj więcej...'}
				</button>
			)}
		</div>
	)
}

export default Truncating
