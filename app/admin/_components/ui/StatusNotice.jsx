export default function StatusNotice({ notice }) {
	if (!notice) return null

	return (
		<p
			className={`rounded-md px-3 py-2 text-sm font-semibold ${
				notice.type === 'error'
					? 'bg-red-100 text-red-800'
					: 'bg-green-100 text-green-800'
			}`}
		>
			{notice.text}
		</p>
	)
}
