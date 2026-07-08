'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { SelectArrowDown, SelectArrowUp } from '../Icons'

const Accordion = ({ items }) => {
	const [openIndex, setOpenIndex] = useState(null)

	const toggle = index => {
		setOpenIndex(openIndex === index ? null : index)
	}

	return (
		<dl className='flex flex-col gap-7 md:gap-10 lg:gap-14'>
			{items.map((item, index) => (
				<div key={index}>
					<dt>
						<button
							className='w-full text-left font-semibold flex justify-between items-center gap-3'
							onClick={() => toggle(index)}
						>
							{item.title}
							<span>
								{openIndex === index ? (
									<SelectArrowUp className='w-5 h-3 stroke-white lg:w-8 lg:h-5' />
								) : (
									<SelectArrowDown className='w-5 h-3 lg:w-8 lg:h-5 stroke-white opacity-100' />
								)}
							</span>
						</button>
					</dt>

					<AnimatePresence>
						{openIndex === index && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.3, ease: 'easeInOut' }}
								className='overflow-hidden'
							>
								<dd className='p-3'>{item.content}</dd>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			))}
		</dl>
	)
}

export default Accordion
