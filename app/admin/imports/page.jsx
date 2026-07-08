'use client'

import { useState } from 'react'
import messageToast from '../_components/message'
import Button from '../_components/ui/Button'
import Spin from '../_components/ui/Spin'

const importTypes = [
	{
		type: 'calls2',
		title: 'Calls 2.csv',
		description: 'Wykonane zlecenia z Google Forms: kwoty, źródła, płatności.',
	},
	{
		type: 'leads',
		title: 'Lead.csv',
		description: 'Zgłoszenia z formularzy i strony. Buduje historię źródeł.',
	},
	{
		type: 'workOrders',
		title: 'WorkOrder.csv',
		description: 'Operacyjne karty zleceń z CRM/Telegram.',
	},
]

export default function ImportsPage() {
	const [loadingType, setLoadingType] = useState('')
	const [includeTests, setIncludeTests] = useState(false)
	const [previews, setPreviews] = useState({})
	const [results, setResults] = useState({})

	async function callImport(type, mode) {
		setLoadingType(`${type}:${mode}`)
		try {
			const res = await fetch('/api/admin/imports', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type,
					mode,
					source: 'workspace',
					includeTests,
				}),
			})
			const json = await res.json()
			if (!res.ok || !json.success) {
				throw new Error(json.error || 'Nie udało się wykonać importu.')
			}
			if (mode === 'preview') {
				setPreviews(current => ({ ...current, [type]: json.preview }))
				messageToast.success('Podgląd gotowy')
			} else {
				setResults(current => ({ ...current, [type]: json.result }))
				messageToast.success('Import zakończony')
			}
		} catch (error) {
			console.error(error)
			messageToast.error(error.message || 'Błąd importu', 5)
		} finally {
			setLoadingType('')
		}
	}

	return (
		<section className='space-y-5'>
			<div>
				<h1 className='text-2xl font-semibold text-white'>Import danych</h1>
				<p className='text-sm text-[#d7e4ef]'>
					Synchronizacja CSV z klientami, zleceniami i wykonanymi usługami.
				</p>
			</div>

			<label className='inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white'>
				<input
					type='checkbox'
					checked={includeTests}
					onChange={event => setIncludeTests(event.target.checked)}
				/>
				Importuj też wiersze testowe
			</label>

			<div className='grid gap-4 lg:grid-cols-3'>
				{importTypes.map(item => (
					<div key={item.type} className='opx-panel rounded-md p-4'>
						<div className='min-h-28'>
							<h2 className='text-lg font-bold'>{item.title}</h2>
							<p className='mt-1 text-sm text-[#5f7487]'>{item.description}</p>
						</div>

						<div className='mt-4 flex flex-wrap gap-2'>
							<Button
								type='button'
								variant='secondary'
								onClick={() => callImport(item.type, 'preview')}
								disabled={!!loadingType}
							>
								Podgląd
							</Button>
							<Button
								type='button'
								onClick={() => callImport(item.type, 'import')}
								disabled={!!loadingType}
							>
								Importuj
							</Button>
						</div>

						{loadingType.startsWith(item.type) ? (
							<div className='mt-4'>
								<Spin tip='Przetwarzanie...' />
							</div>
						) : null}

						{previews[item.type] ? (
							<StatsBlock title='Podgląd' data={previews[item.type]} />
						) : null}
						{results[item.type] ? (
							<StatsBlock title='Wynik importu' data={results[item.type]} />
						) : null}
					</div>
				))}
			</div>
		</section>
	)
}

function StatsBlock({ title, data }) {
	return (
		<div className='mt-4 rounded-md border border-[#d9e4ee] bg-[#f4f8fb] p-3'>
			<p className='mb-2 text-sm font-bold'>{title}</p>
			<div className='grid grid-cols-2 gap-2 text-xs text-[#314a60]'>
				{Object.entries(data)
					.filter(([key]) => key !== 'sample' && key !== 'type')
					.map(([key, value]) => (
						<div key={key} className='rounded bg-white px-2 py-1'>
							<span className='block text-[#5f7487]'>{key}</span>
							<strong>{String(value)}</strong>
						</div>
					))}
			</div>
		</div>
	)
}
