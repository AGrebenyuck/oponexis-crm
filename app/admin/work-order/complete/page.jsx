import { Suspense } from 'react'
import WorkOrderCompletionForm from '../../_components/WorkOrderCompletionForm'

export const dynamic = 'force-dynamic'

export default function WorkOrderCompletionPage() {
	return (
		<Suspense
			fallback={
				<div className='py-10 text-center text-sm text-white'>
					Ładowanie formularza...
				</div>
			}
		>
			<WorkOrderCompletionForm />
		</Suspense>
	)
}
