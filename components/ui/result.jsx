import Image from 'next/image'
import { InfoIcon, SuccessIcon } from '../Icons'

const Result = ({ status = 'info', title, subTitle, icon, extra }) => {
	const statusStyles = {
		success: 'text-green-500 border-green-500',
		error: 'text-red-500 border-red-500',
		info: 'text-blue-500 border-blue-500',
		warning: 'text-yellow-500 border-yellow-500',
	}

	return (
		<div className='flex flex-col items-center text-cente'>
			{icon ? (
				<div className={`text-6xl ${statusStyles[status]}`}>{icon}</div>
			) : (
				<div>
					{status === 'success' && <SuccessIcon />}
					{status === 'error' && '✖'}
					{status === 'info' && <InfoIcon />}
					{status === 'warning' && '⚠'}
				</div>
			)}
			<h2 className='text-secondary-orange font-semibold mt-6'>{title}</h2>
			{subTitle && (
				<p className='text-primary-blue font-medium mt-6 mb-16'>{subTitle}</p>
			)}
			<Image src='/logoIcon.svg' width={150} height={144} alt='logo' />
			{extra && <div className='mt-4'>{extra}</div>}
		</div>
	)
}

export default Result
