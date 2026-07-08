import { useState } from 'react'

const AutoComplete = ({
	options = [],
	placeholder = 'Введите текст...',
	onSelect,
}) => {
	const [input, setInput] = useState('')
	const [filteredOptions, setFilteredOptions] = useState([])
	const [open, setOpen] = useState(false)

	// Обработчик изменения ввода
	const handleChange = e => {
		const value = e.target.value
		setInput(value)

		if (value) {
			setFilteredOptions(
				options.filter(opt => opt.toLowerCase().includes(value.toLowerCase()))
			)
			setOpen(true)
		} else {
			setOpen(false)
		}
	}

	// Выбор значения
	const handleSelect = value => {
		setInput(value)
		setOpen(false)
		onSelect(value)
	}

	// Очистка поля
	const handleClear = () => {
		setInput('')
		setFilteredOptions([])
		setOpen(false)
		onSelect('') // Возвращаем все резервации
	}

	return (
		<div className='relative w-64'>
			<div className='relative'>
				<input
					type='text'
					value={input}
					onChange={handleChange}
					placeholder={placeholder}
					className='w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:border-blue-500 pr-10 text-primary-blue'
				/>
				{/* Кнопка очистки */}
				{input && (
					<button
						className='absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-600'
						onClick={handleClear}
					>
						х
					</button>
				)}
			</div>
			{/* Выпадающий список */}
			{open && (
				<ul className='absolute w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-40 overflow-auto text-primary-blue'>
					{filteredOptions.length > 0 ? (
						filteredOptions.map((option, index) => (
							<li
								key={index}
								className='p-2 hover:bg-gray-200 cursor-pointer'
								onClick={() => handleSelect(option)}
							>
								{option}
							</li>
						))
					) : (
						<li className='p-2 text-gray-400'>Нет совпадений</li>
					)}
				</ul>
			)}
		</div>
	)
}

export default AutoComplete
