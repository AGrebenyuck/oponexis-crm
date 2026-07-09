'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'

export default function SubmitButton() {
	const { pending } = useFormStatus()
	const [clicked, setClicked] = useState(false)
	const saving = pending || clicked

	return (
		<button
			type='submit'
			className={`opx-submit ${saving ? 'opx-submit--loading' : ''}`}
			disabled={saving}
			onClick={() => setClicked(true)}
			aria-busy={saving}
		>
			{saving ? (
				<span className='opx-submit-content'>
					<span className='opx-submit-spinner' aria-hidden='true' />
					Zapisywanie...
				</span>
			) : (
				'Zapisz wykonanie'
			)}
		</button>
	)
}
