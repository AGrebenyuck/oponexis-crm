import React, { useState } from 'react'
import clsx from 'clsx'

const StarIcon = ({ className }) => (
	<svg
		className={className}
		width='30'
		height='30'
		viewBox='0 0 50 49'
		fill='currentColor'
	>
		<path
			d='M2.76474 25.8333L10.1814 31.2499L7.36474 39.9729C6.90956 41.3258 6.90379 42.7895 7.3483 44.146C7.79281 45.5024 8.6638 46.6788 9.83141 47.4999C10.979 48.3474 12.3697 48.8014 13.7963 48.7943C15.2229 48.7871 16.609 48.3193 17.7481 47.4604L25.0002 42.1229L32.2543 47.4541C33.3999 48.2967 34.7831 48.7544 36.2051 48.7613C37.6271 48.7682 39.0147 48.3241 40.1684 47.4927C41.3221 46.6613 42.1824 45.4854 42.6258 44.1343C43.0691 42.7831 43.0725 41.3261 42.6356 39.9729L39.8189 31.2499L47.2356 25.8333C48.3796 24.9968 49.2301 23.8203 49.6655 22.4716C50.1009 21.1229 50.0989 19.6712 49.6599 18.3237C49.2209 16.9762 48.3673 15.8019 47.221 14.9685C46.0748 14.1351 44.6944 13.6853 43.2772 13.6833H34.1668L31.4022 5.06661C30.9675 3.71027 30.1132 2.52706 28.9626 1.68758C27.812 0.848105 26.4245 0.395752 25.0002 0.395752C23.5759 0.395752 22.1883 0.848105 21.0377 1.68758C19.8871 2.52706 19.0328 3.71027 18.5981 5.06661L15.8335 13.6833H6.73141C5.31421 13.6853 3.93389 14.1351 2.78762 14.9685C1.64134 15.8019 0.787743 16.9762 0.348744 18.3237C-0.0902546 19.6712 -0.0921977 21.1229 0.343192 22.4716C0.778582 23.8203 1.62903 24.9968 2.77307 25.8333H2.76474Z'
			fill='currentColor'
		/>
	</svg>
)

const Rate = ({ count = 5, value = 0, onChange, allowHalf = false }) => {
	const [hoverValue, setHoverValue] = useState(null)

	const handleClick = index => {
		onChange && onChange(index)
	}

	const handleMouseMove = (event, index) => {
		const { left, width } = event.currentTarget.getBoundingClientRect()
		const mouseX = event.clientX - left
		let newHoverValue = index + 1

		if (allowHalf) {
			newHoverValue = mouseX < width / 2 ? index + 0.5 : index + 1
		}

		setHoverValue(newHoverValue)
	}

	const handleMouseLeave = () => {
		setHoverValue(null)
	}

	return (
		<div className='flex space-x-1' onMouseLeave={handleMouseLeave}>
			{Array.from({ length: count }, (_, index) => {
				const fullValue = index + 1
				const halfValue = index + 0.5

				const isFullActive =
					hoverValue !== null ? hoverValue >= fullValue : value >= fullValue
				const isHalfActive =
					allowHalf &&
					(hoverValue !== null
						? hoverValue >= halfValue
						: value >= halfValue) &&
					!isFullActive

				return (
					<div
						key={index}
						className='relative cursor-pointer w-8 h-8'
						onMouseMove={e => handleMouseMove(e, index)}
						onClick={() => handleClick(hoverValue ?? value)}
					>
						{/* Серый фон звезды */}
						<div className='absolute inset-0 text-gray-300'>
							<StarIcon />
						</div>

						{/* Полностью закрашенная звезда */}
						<div
							className={clsx(
								'absolute inset-0 transition-all duration-200',
								isFullActive ? 'text-secondary-orange' : 'text-primary-blue'
							)}
						>
							<StarIcon />
						</div>

						{/* Половина звезды (левая) */}
						{allowHalf && (
							<div
								className='absolute inset-0 overflow-hidden'
								style={{
									clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)',
								}}
							>
								<div
									className={clsx(
										'absolute inset-0 transition-all duration-200',
										isHalfActive ? 'text-secondary-orange' : 'text-transparent'
									)}
								>
									<StarIcon />
								</div>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}

export default Rate
