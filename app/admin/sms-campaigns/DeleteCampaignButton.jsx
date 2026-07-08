'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteCampaignButton({ id }) {
	const router = useRouter()
	const [deleting, setDeleting] = useState(false)

	async function deleteCampaign() {
		if (!window.confirm('Usunąć kampanię SMS?')) return
		setDeleting(true)
		try {
			const res = await fetch(`/api/admin/sms-campaigns/${id}`, {
				method: 'DELETE',
			})
			const json = await res.json()
			if (!res.ok || !json.success) throw new Error(json.error || 'Nie usunięto kampanii')
			router.refresh()
		} catch (error) {
			window.alert(error.message || 'Nie usunięto kampanii')
		} finally {
			setDeleting(false)
		}
	}

	return (
		<button
			type='button'
			onClick={deleteCampaign}
			disabled={deleting}
			className='rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-bold text-red-700 disabled:opacity-50'
		>
			Usuń
		</button>
	)
}
