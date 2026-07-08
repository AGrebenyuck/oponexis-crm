export default function Field({ label, hint, children, className = '' }) {
	return (
		<label className={`block space-y-1 text-sm ${className}`}>
			<span className='font-bold text-[#132c43]'>{label}</span>
			{children}
			{hint ? <span className='block text-xs text-[#5f7487]'>{hint}</span> : null}
		</label>
	)
}
