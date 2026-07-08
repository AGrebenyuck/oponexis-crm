'use client'

import { AnimatePresence, motion } from 'framer-motion'

const Modal = ({ visible, onClose, children, footer }) => {
	if (!visible) return null

	const handleOverlayClick = e => {
		if (e.target.id === 'modal-overlay') {
			onClose()
		}
	}

	return (
		<AnimatePresence>
			{visible && (
				<div
					id='modal-overlay'
					className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4'
					onClick={handleOverlayClick}
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.2 }}
						className='bg-white rounded-lg shadow-lg w-full max-w-[800px] p-4 overflow-hidden'
					>
						{/* Заголовок */}
						<div className='flex justify-end items-center'>
							<button onClick={onClose}>
								<svg
									className='hover:opacity-100'
									width='28'
									height='28'
									viewBox='0 0 28 28'
									fill='#132C43'
									opacity='.8'
								>
									<path
										d='M16.4748 14.0002L27.4877 2.98851C28.1714 2.30489 28.1714 1.19653 27.4877 0.512959C26.8041 -0.170661 25.6958 -0.170661 25.0122 0.512959L14.0004 11.5258L2.98875 0.512959C2.30513 -0.170661 1.19677 -0.170661 0.513204 0.512959C-0.170362 1.19658 -0.170417 2.30494 0.513204 2.98851L11.526 14.0002L0.513204 25.012C-0.170417 25.6956 -0.170417 26.8039 0.513204 27.4875C1.19682 28.1711 2.30518 28.1711 2.98875 27.4875L14.0004 16.4746L25.0121 27.4875C25.6958 28.1711 26.8041 28.1711 27.4877 27.4875C28.1713 26.8039 28.1713 25.6955 27.4877 25.012L16.4748 14.0002Z'
										fill='inherit'
									/>
								</svg>
							</button>
						</div>

						{/* Контент */}
						<div className='py-4'>{children}</div>

						{/* Футер */}
						{footer ? (
							<div className='flex justify-end space-x-2 mt-4 border-t pt-3'>
								{footer}
							</div>
						) : null}
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	)
}

export default Modal
