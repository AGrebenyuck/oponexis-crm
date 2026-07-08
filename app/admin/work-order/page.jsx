import { Suspense } from 'react'
import WorkOrderEditInner from './work-order-inner'

export default function Page() {
	return (
		<Suspense
			fallback={
				<div className='min-h-screen flex items-center justify-center bg-slate-900 text-slate-100'>
					<p className='text-sm text-slate-300'>Ladowanie zlecenia...</p>
				</div>
			}
		>
			<WorkOrderEditInner />
		</Suspense>
	)
}
