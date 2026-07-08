import clsx from 'clsx'
import { useState } from 'react'

const Segmented = ({ options = [], defaultValue, onChange }) => {
	const [selected, setSelected] = useState(defaultValue || options[0])

	const handleClick = option => {
		setSelected(option)
		onChange && onChange(option)
	}

	return (
		<div className='inline-flex bg-gray-200 p-1 rounded-lg'>
			{options.map(option => (
				<button
					key={option}
					className={clsx(
						'px-4 py-2 rounded-md transition',
						selected === option
							? 'bg-blue-600 text-white'
							: 'text-gray-700 hover:bg-gray-300'
					)}
					onClick={() => handleClick(option)}
				>
					{option}
				</button>
			))}
		</div>
	)
}

export default Segmented
