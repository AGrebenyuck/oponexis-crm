'use client'

import { useFormStatus } from 'react-dom'

export default function SubmitButton() {
	const { pending } = useFormStatus()

	return (
		<button type='submit' className='opx-submit' disabled={pending}>
			{pending ? 'Zapisywanie...' : 'Zapisz wykonanie'}
		</button>
	)
}
