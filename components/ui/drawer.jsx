import clsx from 'clsx'

const Drawer = ({
	visible,
	onClose,
	title,
	children,
	placement = 'right',
	width = 'w-80',
}) => {
	if (!visible) return null

	return (
		<div className='fixed inset-0 z-50'>
			{/* Затемнение фона */}
			<div
				className='fixed inset-0 bg-black bg-opacity-50'
				onClick={onClose}
			></div>

			{/* Drawer */}
			<div
				className={clsx(
					'fixed bg-primary-blue shadow-lg transition-transform duration-300 flex flex-col text-white',
					width,
					placement === 'right' ? 'right-0 translate-x-0 h-full' : '',
					placement === 'left' ? 'left-0 translate-x-0 h-full' : '',
					placement === 'top' ? 'top-0 translate-y-0 w-full h-64' : '',
					placement === 'bottom' ? 'bottom-0 translate-y-0 w-full h-64' : ''
				)}
			>
				{/* Заголовок */}
				<div className='flex justify-between items-center p-4 border-b'>
					<h2 className='text-lg font-semibold'>{title}</h2>
					<button
						className='text-gray-400 hover:text-gray-600'
						onClick={onClose}
					>
						✖
					</button>
				</div>

				{/* Контент */}
				<div className='flex-1 overflow-auto p-4'>{children}</div>
			</div>
		</div>
	)
}

export default Drawer
