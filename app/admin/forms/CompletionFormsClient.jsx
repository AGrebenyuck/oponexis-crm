'use client'

import { useMemo, useRef, useState } from 'react'
import {
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from 'recharts'
import Button from '../_components/ui/Button'

const COLORS = ['#2c70b7', '#fd6d02', '#13a26b', '#7c3aed', '#f59e0b', '#0ea5e9']

const typeLabels = {
	short_text: 'Krótka odpowiedź',
	long_text: 'Długa odpowiedź',
	phone: 'Telefon',
	number: 'Liczba',
	date: 'Data',
	single_choice: 'Jedna odpowiedź',
	multiple_choice: 'Wiele odpowiedzi',
}

const customTypeOptions = Object.entries(typeLabels).map(([value, label]) => ({
	value,
	label,
}))

const emptyQuestionForm = {
	id: '',
	label: '',
	type: 'short_text',
	required: false,
	options: '',
	description: '',
	active: true,
}

const emptySystemForm = null

function formatMoney(value) {
	return `${Math.round(Number(value || 0)).toLocaleString('pl-PL')} zł`
}

function formatDate(value) {
	if (!value) return '-'
	return new Intl.DateTimeFormat('pl-PL', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(new Date(value))
}

function percent(value, total) {
	if (!total) return '0%'
	return `${Math.round((Number(value || 0) / total) * 1000) / 10}%`
}

export default function CompletionFormsClient({
	analytics,
	customQuestions = [],
	systemQuestions = [],
}) {
	const [section, setSection] = useState('responses')
	const [responsesView, setResponsesView] = useState('summary')
	const questionByKey = useMemo(
		() => Object.fromEntries(analytics.questions.map(question => [question.key, question])),
		[analytics.questions]
	)

	return (
		<section className='space-y-5'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold text-white'>Formularz wykonania</h1>
					<p className='text-sm text-[#d7e4ef]'>
						Pytania, odpowiedzi i statystyka po wykonanych zleceniach.
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<a href='/api/admin/forms/completion/export' className='opx-btn-secondary inline-flex rounded-md px-4 py-2 text-sm'>
						Pobierz CSV
					</a>
				</div>
			</div>

			<div className='opx-panel rounded-md p-4'>
				<div className='flex flex-wrap items-center gap-2 border-b border-[#e7eef5] pb-3'>
					<TopTab active={section === 'questions'} onClick={() => setSection('questions')}>
						Pytania
					</TopTab>
					<TopTab active={section === 'responses'} onClick={() => setSection('responses')}>
						Odpowiedzi
						<span className='ml-2 rounded-full bg-[#fd6d02] px-2 py-0.5 text-xs text-white'>
							{analytics.totalResponses}
						</span>
					</TopTab>
				</div>

				{section === 'questions' ? (
					<QuestionsPanel
						questions={analytics.questions}
						customQuestions={customQuestions}
						systemQuestions={systemQuestions}
					/>
				) : (
					<ResponsesPanel
						analytics={analytics}
						questionByKey={questionByKey}
						responsesView={responsesView}
						setResponsesView={setResponsesView}
					/>
				)}
			</div>
		</section>
	)
}

function TopTab({ active, onClick, children }) {
	return (
		<button
			type='button'
			onClick={onClick}
			className={`rounded-md px-3 py-2 text-sm font-bold transition ${
				active
					? 'bg-[#132c43] text-white'
					: 'text-[#5f7487] hover:bg-[#f4f8fb] hover:text-[#132c43]'
			}`}
		>
			{children}
		</button>
	)
}

function QuestionsPanel({ questions, customQuestions, systemQuestions: configuredSystemQuestions }) {
	const initialSystemQuestions = configuredSystemQuestions.length
		? configuredSystemQuestions
		: questions.filter(question => !question.custom)
	const [systemItems, setSystemItems] = useState(initialSystemQuestions)
	const [items, setItems] = useState(customQuestions)
	const [form, setForm] = useState(emptyQuestionForm)
	const [systemForm, setSystemForm] = useState(emptySystemForm)
	const [optionDraft, setOptionDraft] = useState('')
	const [saving, setSaving] = useState(false)
	const [message, setMessage] = useState(null)
	const systemFormRef = useRef(null)

	const activeCustom = items.filter(question => question.active !== false)
	const inactiveCustom = items.filter(question => question.active === false)

	async function refresh() {
		const response = await fetch('/api/admin/forms/completion/questions', { cache: 'no-store' })
		const data = await response.json()
		if (data.ok) setItems(data.questions)
	}

	async function saveSystemOptions(event) {
		event.preventDefault()
		if (!systemForm) return
		setSaving(true)
		setMessage(null)
		try {
			const response = await fetch('/api/admin/forms/completion/system-options', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(systemForm),
			})
			const data = await response.json()
			if (!data.ok) throw new Error(data.error || 'Nie udało się zapisać opcji.')
			const savedOptions = Array.isArray(data.optionSet?.options)
				? data.optionSet.options
				: systemForm.options
			setSystemItems(current =>
				current.map(question =>
					question.key === systemForm.key
						? { ...question, options: savedOptions }
						: question
				)
			)
			setSystemForm(emptySystemForm)
			setOptionDraft('')
			setMessage({
				type: 'success',
				text: 'Zapisano opcje.',
			})
		} catch (error) {
			setMessage({ type: 'error', text: error.message })
		} finally {
			setSaving(false)
		}
	}

	function openSystemOptions(question) {
		setMessage(null)
		setOptionDraft('')
		setSystemForm({
			key: question.key,
			label: question.label,
			options: [...(question.options || [])],
		})
		window.setTimeout(() => {
			systemFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}, 50)
	}

	function updateSystemOption(index, value) {
		setSystemForm(current => {
			if (!current) return current
			const options = [...current.options]
			options[index] = value
			return { ...current, options }
		})
	}

	function removeSystemOption(index) {
		setSystemForm(current => {
			if (!current) return current
			return {
				...current,
				options: current.options.filter((_, optionIndex) => optionIndex !== index),
			}
		})
	}

	function addSystemOption() {
		const value = optionDraft.trim()
		if (!value) return
		setSystemForm(current => {
			if (!current) return current
			const exists = current.options.some(option => option.toLowerCase() === value.toLowerCase())
			return exists ? current : { ...current, options: [...current.options, value] }
		})
		setOptionDraft('')
	}

	async function saveQuestion(event) {
		event.preventDefault()
		setSaving(true)
		setMessage(null)
		try {
			const response = await fetch('/api/admin/forms/completion/questions', {
				method: form.id ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			})
			const data = await response.json()
			if (!data.ok) throw new Error(data.error || 'Nie udało się zapisać pytania.')
			await refresh()
			setForm(emptyQuestionForm)
			setMessage({ type: 'success', text: form.id ? 'Zapisano pytanie.' : 'Dodano pytanie.' })
		} catch (error) {
			setMessage({ type: 'error', text: error.message })
		} finally {
			setSaving(false)
		}
	}

	async function updateOrder(nextItems) {
		setItems(nextItems)
		const order = nextItems.filter(question => question.active !== false).map(question => question.id)
		await fetch('/api/admin/forms/completion/questions', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ order }),
		})
		await refresh()
	}

	function moveQuestion(index, direction) {
		const nextIndex = index + direction
		if (nextIndex < 0 || nextIndex >= activeCustom.length) return
		const reorderedActive = [...activeCustom]
		const [item] = reorderedActive.splice(index, 1)
		reorderedActive.splice(nextIndex, 0, item)
		updateOrder([...reorderedActive, ...inactiveCustom])
	}

	async function setQuestionActive(question, active) {
		setSaving(true)
		setMessage(null)
		try {
			const response = await fetch('/api/admin/forms/completion/questions', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...question,
					active,
					options: (question.options || []).join('\n'),
				}),
			})
			const data = await response.json()
			if (!data.ok) throw new Error(data.error || 'Nie udało się zmienić pytania.')
			await refresh()
			setMessage({ type: 'success', text: active ? 'Pytanie przywrócone.' : 'Pytanie wyłączone.' })
		} catch (error) {
			setMessage({ type: 'error', text: error.message })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className='space-y-4 pt-4'>
			{message ? (
				<div
					className={`rounded-md border p-3 text-sm font-semibold ${
						message.type === 'error'
							? 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]'
							: 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]'
					}`}
				>
					{message.text}
				</div>
			) : null}

			<form onSubmit={saveQuestion} className='rounded-md border border-[#d9e4ee] bg-white p-4'>
				<div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_8rem]'>
					<label className='text-sm font-bold text-[#132c43]'>
						Nazwa pytania
						<input
							value={form.label}
							onChange={event => setForm(current => ({ ...current, label: event.target.value }))}
							className='mt-1 w-full rounded-md border border-[#cbd8e4] px-3 py-2 font-normal'
							placeholder='Np. Rozmiar opony'
						/>
					</label>
					<label className='text-sm font-bold text-[#132c43]'>
						Typ
						<select
							value={form.type}
							onChange={event => setForm(current => ({ ...current, type: event.target.value }))}
							className='mt-1 w-full rounded-md border border-[#cbd8e4] px-3 py-2 font-normal'
						>
							{customTypeOptions.map(option => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>
					<label className='flex items-end gap-2 pb-2 text-sm font-bold text-[#132c43]'>
						<input
							type='checkbox'
							checked={form.required}
							onChange={event => setForm(current => ({ ...current, required: event.target.checked }))}
						/>
						Wymagane
					</label>
				</div>
				{['single_choice', 'multiple_choice'].includes(form.type) ? (
					<label className='mt-3 block text-sm font-bold text-[#132c43]'>
						Opcje odpowiedzi, jedna w linii
						<textarea
							value={form.options}
							onChange={event => setForm(current => ({ ...current, options: event.target.value }))}
							rows={3}
							className='mt-1 w-full rounded-md border border-[#cbd8e4] px-3 py-2 font-normal'
							placeholder={'Tak\nNie'}
						/>
					</label>
				) : null}
				<div className='mt-3 flex flex-wrap gap-2'>
					<Button type='submit' disabled={saving}>
						{saving ? 'Zapisywanie...' : form.id ? 'Zapisz pytanie' : 'Dodaj pytanie'}
					</Button>
					{form.id ? (
						<Button type='button' variant='secondary' onClick={() => setForm(emptyQuestionForm)}>
							Anuluj edycję
						</Button>
					) : null}
				</div>
			</form>

			{systemForm ? (
				<form
					ref={systemFormRef}
					onSubmit={saveSystemOptions}
					className='rounded-md border border-[#fd6d02]/40 bg-[#fff7ed] p-4 scroll-mt-4'
				>
					<div className='flex flex-wrap items-start justify-between gap-3'>
						<div>
							<p className='text-xs font-bold uppercase text-[#9a3412]'>Opcje pola systemowego</p>
							<h2 className='text-lg font-bold text-[#132c43]'>{systemForm.label}</h2>
						</div>
						<Button type='button' variant='secondary' onClick={() => setSystemForm(emptySystemForm)}>
							Anuluj
						</Button>
					</div>
					<div className='mt-4 flex flex-wrap gap-2'>
						{systemForm.options.map((option, index) => (
							<div
								key={`${option}-${index}`}
								className='inline-flex max-w-full items-center gap-2 rounded-full border border-[#d9e4ee] bg-white px-2 py-1 shadow-sm'
							>
								<input
									value={option}
									onChange={event => updateSystemOption(index, event.target.value)}
									className='min-w-0 max-w-[220px] border-0 bg-transparent px-2 py-1 text-sm font-bold text-[#132c43] outline-none'
									aria-label={`Opcja ${index + 1}`}
								/>
								<button
									type='button'
									onClick={() => removeSystemOption(index)}
									className='grid h-7 w-7 place-items-center rounded-full bg-[#fee2e2] text-sm font-black text-[#b91c1c] transition hover:bg-[#fecaca]'
									aria-label={`Usuń ${option}`}
								>
									×
								</button>
							</div>
						))}
					</div>
					<div className='mt-4 flex flex-col gap-2 sm:flex-row'>
						<input
							value={optionDraft}
							onChange={event => setOptionDraft(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Enter') {
									event.preventDefault()
									addSystemOption()
								}
							}}
							className='min-w-0 flex-1 rounded-md border border-[#cbd8e4] bg-white px-3 py-2 text-sm text-[#132c43]'
							placeholder='Dodaj nową opcję'
						/>
						<Button type='button' variant='secondary' onClick={addSystemOption}>
							+ Dodaj
						</Button>
					</div>
					<div className='mt-4'>
						<Button type='submit' disabled={saving}>
							{saving ? 'Zapisywanie...' : 'Zapisz opcje'}
						</Button>
					</div>
				</form>
			) : null}

			<div className='rounded-md border border-[#bfdbfe] bg-[#eff6ff] p-3 text-sm text-[#1d4ed8]'>
				<strong>Pola systemowe.</strong> Są stałą częścią formularza wykonania. Własne
				pytania poniżej można dodawać, edytować, wyłączać i przesuwać.
			</div>
			<div className='grid gap-3 md:grid-cols-2'>
				{systemItems.map((question, index) => (
					<div key={question.key} className='rounded-md border border-[#d9e4ee] bg-white p-4'>
						<div className='flex items-start justify-between gap-3'>
							<div>
								<p className='text-xs font-bold uppercase text-[#5f7487]'>
									Pytanie {index + 1}
								</p>
								<h2 className='mt-1 text-lg font-bold text-[#132c43]'>
									{question.label}
									{question.required ? <span className='text-[#fd6d02]'> *</span> : null}
								</h2>
							</div>
							<span className='rounded-full bg-[#f4f8fb] px-2 py-1 text-xs font-bold text-[#5f7487]'>
								{typeLabels[question.type] || question.type}
							</span>
						</div>
						{question.description ? (
							<p className='mt-2 text-sm text-[#5f7487]'>{question.description}</p>
						) : null}
						{question.options?.length ? (
							<div className='mt-3 flex flex-wrap gap-2'>
								{question.options.map(option => (
									<span
										key={option}
										className='rounded-full border border-[#d9e4ee] px-2 py-1 text-xs font-semibold text-[#132c43]'
									>
										{option}
									</span>
								))}
							</div>
						) : null}
						{question.editableOptions ? (
							<div className='mt-4'>
								<Button
									type='button'
									variant='secondary'
									onClick={() => openSystemOptions(question)}
								>
									Edytuj opcje
								</Button>
							</div>
						) : null}
					</div>
				))}
			</div>

			<div className='rounded-md border border-[#d9e4ee] bg-white p-4'>
				<h2 className='text-lg font-bold text-[#132c43]'>Własne pytania</h2>
				<div className='mt-3 space-y-2'>
					{activeCustom.length ? (
						activeCustom.map((question, index) => (
							<div
								key={question.id}
								className='grid gap-2 rounded-md border border-[#e7eef5] p-3 md:grid-cols-[auto_1fr_auto]'
							>
								<div className='flex gap-1'>
									<button
										type='button'
										onClick={() => moveQuestion(index, -1)}
										className='rounded-md bg-[#f4f8fb] px-2 py-1 text-sm font-bold text-[#132c43]'
										disabled={index === 0}
									>
										↑
									</button>
									<button
										type='button'
										onClick={() => moveQuestion(index, 1)}
										className='rounded-md bg-[#f4f8fb] px-2 py-1 text-sm font-bold text-[#132c43]'
										disabled={index === activeCustom.length - 1}
									>
										↓
									</button>
								</div>
								<div>
									<p className='font-bold text-[#132c43]'>
										{question.label}
										{question.required ? <span className='text-[#fd6d02]'> *</span> : null}
									</p>
									<p className='text-xs font-semibold text-[#5f7487]'>
										{typeLabels[question.type] || question.type}
										{question.options?.length ? ` · ${question.options.join(', ')}` : ''}
									</p>
								</div>
								<div className='flex flex-wrap gap-2 md:justify-end'>
									<Button
										type='button'
										variant='secondary'
										onClick={() =>
											setForm({
												...question,
												options: (question.options || []).join('\n'),
											})
										}
									>
										Edytuj
									</Button>
									<Button
										type='button'
										variant='secondary'
										onClick={() => setQuestionActive(question, false)}
									>
										Wyłącz
									</Button>
								</div>
							</div>
						))
					) : (
						<p className='rounded-md bg-[#f8fbfd] p-3 text-sm text-[#5f7487]'>
							Brak własnych pytań.
						</p>
					)}
				</div>
				{inactiveCustom.length ? (
					<div className='mt-4 border-t border-[#e7eef5] pt-3'>
						<p className='text-xs font-bold uppercase text-[#5f7487]'>Wyłączone</p>
						<div className='mt-2 flex flex-wrap gap-2'>
							{inactiveCustom.map(question => (
								<button
									key={question.id}
									type='button'
									onClick={() => setQuestionActive(question, true)}
									className='rounded-full border border-[#d9e4ee] px-3 py-1 text-sm font-semibold text-[#132c43]'
								>
									{question.label}
								</button>
							))}
						</div>
					</div>
				) : null}
			</div>
		</div>
	)
}

function ResponsesPanel({
	analytics,
	questionByKey,
	responsesView,
	setResponsesView,
}) {
	return (
		<div className='space-y-4 pt-4'>
			<div className='grid gap-3 md:grid-cols-3'>
				<Metric label='Odpowiedzi' value={analytics.totalResponses} />
				<Metric label='Przychód z formularzy' value={formatMoney(analytics.totalAmount)} />
				<Metric label='Średni rachunek' value={formatMoney(analytics.averageAmount)} />
			</div>

			<div className='flex flex-wrap gap-2 rounded-md border border-[#e7eef5] bg-[#f8fbfd] p-2'>
				<TopTab active={responsesView === 'summary'} onClick={() => setResponsesView('summary')}>
					Summary
				</TopTab>
				<TopTab active={responsesView === 'question'} onClick={() => setResponsesView('question')}>
					Pytania
				</TopTab>
				<TopTab active={responsesView === 'user'} onClick={() => setResponsesView('user')}>
					Odpowiedzi osobno
				</TopTab>
			</div>

			{responsesView === 'summary' ? (
				<div className='space-y-4'>
					{Object.entries(analytics.summary).map(([key, summary]) => (
						<ResponseCard
							key={key}
							question={questionByKey[key]}
							summary={summary}
							total={analytics.totalResponses}
						/>
					))}
				</div>
			) : responsesView === 'question' ? (
				<QuestionBreakdown analytics={analytics} questionByKey={questionByKey} />
			) : (
				<IndividualResponses responses={analytics.responses} />
			)}
		</div>
	)
}

function Metric({ label, value }) {
	return (
		<div className='rounded-md border border-[#d9e4ee] bg-white p-4'>
			<p className='text-xs font-bold uppercase text-[#5f7487]'>{label}</p>
			<p className='mt-1 text-2xl font-black text-[#132c43]'>{value}</p>
		</div>
	)
}

function ResponseCard({ question, summary, total }) {
	return (
		<div className='rounded-md border border-[#d9e4ee] bg-white p-4'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h2 className='text-xl font-bold text-[#132c43]'>{question?.label}</h2>
					<p className='mt-1 text-sm font-semibold text-[#5f7487]'>
						{summary.count} odpowiedzi
					</p>
				</div>
				{['pie', 'bar'].includes(summary.type) ? (
					<button
						type='button'
						onClick={() => copySummary(question?.label, summary)}
						className='text-sm font-bold text-[#2c70b7] hover:underline'
					>
						Kopiuj dane
					</button>
				) : null}
			</div>

			<div className='mt-5'>
				{summary.type === 'pie' ? (
					<PieSummary data={summary.data} total={summary.count || total} />
				) : summary.type === 'bar' ? (
					<BarSummary data={summary.data} total={summary.count || total} />
				) : summary.type === 'date' ? (
					<DateSummary months={summary.months} />
				) : (
					<ValueList values={summary.values} />
				)}
			</div>
		</div>
	)
}

function PieSummary({ data, total }) {
	if (!data.length) return <EmptySummary />

	return (
		<div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]'>
			<div className='h-72'>
				<ResponsiveContainer width='100%' height='100%'>
					<PieChart>
						<Tooltip formatter={(value, name) => [`${value} (${percent(value, total)})`, name]} />
						<Pie
							data={data}
							dataKey='value'
							nameKey='name'
							innerRadius={0}
							outerRadius={105}
							label={({ value }) => percent(value, total)}
							labelLine={false}
						>
							{data.map((entry, index) => (
								<Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
							))}
						</Pie>
					</PieChart>
				</ResponsiveContainer>
			</div>
			<LegendList data={data} total={total} />
		</div>
	)
}

function BarSummary({ data, total }) {
	if (!data.length) return <EmptySummary />
	const max = Math.max(1, ...data.map(item => item.value))

	return (
		<div className='space-y-3'>
			{data.map(item => (
				<div key={item.name} className='grid gap-2 sm:grid-cols-[12rem_1fr_7rem] sm:items-center'>
					<p className='text-sm font-bold leading-tight text-[#132c43]'>{item.name}</p>
					<div className='h-3 overflow-hidden rounded-full bg-[#efedff]'>
						<div
							className='h-full rounded-full bg-[#5b45e7]'
							style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }}
						/>
					</div>
					<p className='text-sm font-semibold text-[#5f7487] sm:text-right'>
						{item.value} ({percent(item.value, total)})
					</p>
				</div>
			))}
		</div>
	)
}

function LegendList({ data, total }) {
	return (
		<div className='space-y-2 self-center'>
			{data.map((item, index) => (
				<div key={item.name} className='flex items-center justify-between gap-3 text-sm'>
					<span className='inline-flex items-center gap-2 font-semibold text-[#132c43]'>
						<span
							className='h-3 w-3 rounded-full'
							style={{ background: COLORS[index % COLORS.length] }}
						/>
						{item.name}
					</span>
					<span className='text-[#5f7487]'>{percent(item.value, total)}</span>
				</div>
			))}
		</div>
	)
}

function DateSummary({ months }) {
	if (!months.length) return <EmptySummary />
	const max = Math.max(1, ...months.flatMap(month => month.days.map(day => day.count)))

	return (
		<div className='space-y-4 overflow-x-auto pb-2'>
			{months.map(month => (
				<div key={month.key} className='grid min-w-[680px] grid-cols-[9rem_1fr] gap-4'>
					<div className='border-r border-[#132c43] pr-4 text-right text-sm font-black text-[#132c43]'>
						{month.label}
					</div>
					<div className='flex flex-wrap gap-2'>
						{month.days.map(day => {
							const strong = day.count >= Math.max(2, Math.ceil(max * 0.6))
							return (
								<span
									key={`${month.key}-${day.day}`}
									className={`inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-sm font-bold ${
										strong ? 'bg-[#5b45e7] text-white' : 'bg-[#efedff] text-[#132c43]'
									}`}
								>
									{day.day}
									{day.count > 1 ? (
										<span className='rounded-full bg-white px-1.5 py-0.5 text-xs text-[#5b45e7]'>
											{day.count}
										</span>
									) : null}
								</span>
							)
						})}
					</div>
				</div>
			))}
		</div>
	)
}

function ValueList({ values }) {
	if (!values?.length) return <EmptySummary />
	return (
		<div className='max-h-80 space-y-2 overflow-y-auto pr-2'>
			{values.slice(0, 300).map((value, index) => (
				<div key={`${value}-${index}`} className='rounded-md bg-[#f8fbfd] px-3 py-2 text-[#132c43]'>
					{value}
				</div>
			))}
		</div>
	)
}

function ResponsesTable({ responses }) {
	return (
		<div className='overflow-x-auto rounded-md border border-[#d9e4ee] bg-white'>
			<table className='min-w-[980px] w-full text-left text-sm'>
				<thead className='bg-[#f4f8fb] text-xs uppercase text-[#5f7487]'>
					<tr>
						<th className='px-3 py-2'>Data</th>
						<th className='px-3 py-2'>Imię</th>
						<th className='px-3 py-2'>Telefon</th>
						<th className='px-3 py-2'>Źródło</th>
						<th className='px-3 py-2'>Usługi</th>
						<th className='px-3 py-2'>Kwota</th>
						<th className='px-3 py-2'>Płatność</th>
					</tr>
				</thead>
				<tbody className='divide-y divide-[#e7eef5]'>
					{responses.slice(0, 80).map(response => (
						<tr key={response.id}>
							<td className='px-3 py-2'>{formatDate(response.completedAt)}</td>
							<td className='px-3 py-2 font-semibold'>{response.name || '-'}</td>
							<td className='px-3 py-2'>{response.phone}</td>
							<td className='px-3 py-2'>{response.source || '-'}</td>
							<td className='px-3 py-2'>{response.serviceNames.join(', ') || '-'}</td>
							<td className='px-3 py-2'>{response.amount ? formatMoney(response.amount) : '-'}</td>
							<td className='px-3 py-2'>{response.paymentMethod || '-'}</td>
						</tr>
					))}
				</tbody>
			</table>
			{responses.length > 80 ? (
				<p className='border-t border-[#e7eef5] px-3 py-2 text-xs text-[#5f7487]'>
					Pokazano 80 pierwszych rekordów. Pełne dane pobierzesz w CSV.
				</p>
			) : null}
		</div>
	)
}

function QuestionBreakdown({ analytics, questionByKey }) {
	return (
		<div className='grid gap-3 md:grid-cols-2'>
			{Object.entries(analytics.summary).map(([key, summary]) => (
				<div key={key} className='rounded-md border border-[#d9e4ee] bg-white p-4'>
					<p className='text-sm font-bold text-[#132c43]'>{questionByKey[key]?.label}</p>
					<p className='mt-1 text-2xl font-black text-[#132c43]'>{summary.count}</p>
					<p className='text-xs font-semibold uppercase text-[#5f7487]'>odpowiedzi</p>
				</div>
			))}
		</div>
	)
}

function IndividualResponses({ responses }) {
	const pageSize = 12
	const [page, setPage] = useState(1)
	const totalPages = Math.max(1, Math.ceil(responses.length / pageSize))
	const visible = responses.slice((page - 1) * pageSize, page * pageSize)

	return (
		<div className='space-y-3'>
			<div className='max-h-[680px] overflow-y-auto pr-1'>
				<div className='grid gap-3 md:grid-cols-2'>
					{visible.map(response => (
						<div key={response.id} className='rounded-md border border-[#d9e4ee] bg-white p-4'>
							<div className='flex items-start justify-between gap-3'>
								<div>
									<p className='font-bold text-[#132c43]'>{response.name || 'Brak imienia'}</p>
									<p className='text-sm text-[#5f7487]'>{response.phone}</p>
								</div>
								<span className='rounded-full bg-[#f4f8fb] px-2 py-1 text-xs font-bold text-[#5f7487]'>
									{formatDate(response.completedAt)}
								</span>
							</div>
							<div className='mt-3 space-y-1 text-sm text-[#132c43]'>
								<p>Usługi: {response.serviceNames.join(', ') || '-'}</p>
								<p>Źródło: {response.source || '-'}</p>
								<p>Kwota: {response.amount ? formatMoney(response.amount) : '-'}</p>
								{response.notes ? <p>Notatka: {response.notes}</p> : null}
								{Object.entries(response.customAnswers || {}).length ? (
									<p className='text-[#5f7487]'>
										Dodatkowe odpowiedzi: {Object.values(response.customAnswers).flat().filter(Boolean).join(', ')}
									</p>
								) : null}
							</div>
						</div>
					))}
				</div>
			</div>
			<div className='flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#e7eef5] bg-white px-3 py-2'>
				<p className='text-sm font-semibold text-[#5f7487]'>
					Strona {page} z {totalPages}
				</p>
				<div className='flex gap-2'>
					<Button
						type='button'
						variant='secondary'
						disabled={page <= 1}
						onClick={() => setPage(current => Math.max(1, current - 1))}
					>
						Wstecz
					</Button>
					<Button
						type='button'
						variant='secondary'
						disabled={page >= totalPages}
						onClick={() => setPage(current => Math.min(totalPages, current + 1))}
					>
						Dalej
					</Button>
				</div>
			</div>
		</div>
	)
}

function EmptySummary() {
	return <p className='rounded-md bg-[#f8fbfd] p-4 text-sm text-[#5f7487]'>Brak odpowiedzi.</p>
}

function copySummary(label, summary) {
	const lines = [label, ...(summary.data || []).map(item => `${item.name}: ${item.value}`)]
	navigator.clipboard?.writeText(lines.join('\n')).catch(() => {})
}
