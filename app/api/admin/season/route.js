import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'
import {
	CONTACT_STATUSES,
	SEASONS,
	completionMatchesSeason,
	currentSeason,
	isStorageService,
	previousSeason,
	seasonFromDate,
	seasonLabel,
	seasonPeriodLabel,
	seasonYearFromDate,
} from '@/lib/season'

function money(value) {
	return Math.round((Number(value) || 0) * 100) / 100
}

function unique(values) {
	return Array.from(new Set(values.filter(Boolean)))
}

function statusFor(customer, season, year) {
	return (
		customer.seasonStatuses?.find(
			item => item.season === season && item.year === Number(year)
		) || null
	)
}

function completionDate(completion) {
	return completion.completedAt || completion.createdAt || null
}

function serializeCompletion(item, customer = null) {
	const date = completionDate(item)
	return {
		id: item.id,
		customerId: item.customerId || customer?.id || null,
		workOrderId: item.workOrderId || null,
		name: item.name || customer?.name || 'Brak imienia',
		phone: item.phone || customer?.phone || '',
		source: item.source || customer?.source || null,
		date,
		season: date ? seasonFromDate(date) : null,
		year: date ? seasonYearFromDate(date) : null,
		services: item.serviceNames || [],
		amount: money(item.amount || 0),
		paymentMethod: item.paymentMethod || null,
		invoiceIssued: item.invoiceIssued,
		notes: item.notes || null,
		car: item.car || null,
	}
}

function completionMatchesSelectedSeasons(completion, filters) {
	return filters.seasons.some(season =>
		completionMatchesSeason(completion, season, filters.year)
	)
}

function aggregateCustomer(customer, filters) {
	const { seasons, year, primarySeason } = filters
	const completions = (customer.completions || []).filter(
		item => !item.isTest && item.serviceUsed !== false
	)
	const paid = completions.filter(item => typeof item.amount === 'number')
	const seasonCompletions = completions.filter(item =>
		completionMatchesSelectedSeasons(item, filters)
	)
	const previous = previousSeason({ season: primarySeason, year })
	const previousSeasonCompletions = completions.filter(item =>
		completionMatchesSeason(item, previous.season, previous.year)
	)
	const lastCompletion = completions
		.slice()
		.sort(
			(a, b) =>
				new Date(b.completedAt || b.createdAt).getTime() -
				new Date(a.completedAt || a.createdAt).getTime()
		)[0]
	const totalSpent = money(paid.reduce((sum, item) => sum + (item.amount || 0), 0))
	const totalOrders = completions.length
	const services = unique(completions.flatMap(item => item.serviceNames || []))
	const hasStorage = completions.some(item => isStorageService(item.serviceNames))
	const source = customer.source || lastCompletion?.source || null
	const status = statusFor(customer, primarySeason, year)
	const history = completions
		.slice()
		.sort(
			(a, b) =>
				new Date(completionDate(b) || 0).getTime() -
				new Date(completionDate(a) || 0).getTime()
		)
		.map(item => serializeCompletion(item, customer))

	return {
		id: customer.id,
		name: customer.name || lastCompletion?.name || 'Brak imienia',
		phone: customer.phone,
		source,
		lastOrderDate: lastCompletion?.completedAt || null,
		lastService: lastCompletion?.serviceNames?.join(', ') || null,
		totalOrders,
		totalSpent,
		averageCheck: totalOrders ? money(totalSpent / totalOrders) : 0,
		hasStorage,
		services,
		ordersInSeason: seasonCompletions.length,
		ordersInPreviousSeason: previousSeasonCompletions.length,
		spentInSeason: money(
			seasonCompletions.reduce((sum, item) => sum + (item.amount || 0), 0)
		),
		repeatCustomer: totalOrders >= 2,
		contactStatus: status?.status || 'NOT_CONTACTED',
		contactNote: status?.note || '',
		nextContactAt: status?.nextContactAt || null,
		history,
		seasonHistory: history.filter(
			item => seasons.includes(item.season) && item.year === Number(year)
		),
	}
}

function aggregateDetachedCompletion(completion, filters) {
	const status = statusFor(
		{ seasonStatuses: [] },
		filters.primarySeason,
		filters.year
	)
	const history = [serializeCompletion(completion)]
	const amount = money(completion.amount || 0)
	return {
		id: `completion-${completion.id}`,
		customerId: null,
		name: completion.name || 'Brak imienia',
		phone: completion.phone,
		source: completion.source || null,
		lastOrderDate: completion.completedAt || completion.createdAt || null,
		lastService: completion.serviceNames?.join(', ') || null,
		totalOrders: 1,
		totalSpent: amount,
		averageCheck: amount,
		hasStorage: isStorageService(completion.serviceNames),
		services: completion.serviceNames || [],
		ordersInSeason: completionMatchesSelectedSeasons(completion, filters) ? 1 : 0,
		ordersInPreviousSeason: 0,
		spentInSeason: completionMatchesSelectedSeasons(completion, filters) ? amount : 0,
		repeatCustomer: false,
		contactStatus: status?.status || 'NOT_CONTACTED',
		contactNote: '',
		nextContactAt: null,
		history,
		seasonHistory: completionMatchesSelectedSeasons(completion, filters) ? history : [],
	}
}

function parseFilters(req) {
	const { searchParams } = new URL(req.url)
	const now = new Date()
	const rawSeasons =
		searchParams.get('seasons') ||
		searchParams.getAll('season').join(',') ||
		currentSeason(now)
	const seasons = rawSeasons
		.split(',')
		.map(item => item.trim())
		.filter(item => SEASONS.includes(item))
	const selectedSeasons = seasons.length ? Array.from(new Set(seasons)) : [currentSeason(now)]

	return {
		season: selectedSeasons[0],
		seasons: selectedSeasons,
		primarySeason: selectedSeasons[0],
		year: Number(searchParams.get('year') || now.getFullYear()),
		status: searchParams.get('status') || '',
		source: searchParams.get('source') || '',
		repeat: searchParams.get('repeat') || '',
		storage: searchParams.get('storage') || '',
		search: searchParams.get('search') || '',
		scope: searchParams.get('scope') || 'season',
	}
}

function applyFilters(rows, filters) {
	return rows.filter(row => {
		if (row.totalOrders <= 0) return false
		if (filters.scope === 'season' && row.ordersInSeason <= 0) return false
		if (
			filters.scope === 'previous_no_repeat' &&
			!(row.ordersInPreviousSeason > 0 && row.ordersInSeason === 0)
		) {
			return false
		}
		if (filters.status && row.contactStatus !== filters.status) return false
		if (filters.source && row.source !== filters.source) return false
		if (filters.repeat === 'yes' && !row.repeatCustomer) return false
		if (filters.repeat === 'no' && row.repeatCustomer) return false
		if (filters.storage === 'yes' && !row.hasStorage) return false
		if (filters.storage === 'no' && row.hasStorage) return false
		if (filters.search) {
			const haystack = `${row.name} ${row.phone} ${row.services.join(' ')}`.toLowerCase()
			if (!haystack.includes(filters.search.toLowerCase())) return false
		}
		return true
	})
}

function buildOverview(allRows, filteredRows, completions, filters) {
	const activeRows = allRows.filter(row => row.totalOrders > 0)
	const paid = completions.filter(
		item => !item.isTest && item.serviceUsed !== false && typeof item.amount === 'number'
	)
	const seasonPaid = paid.filter(item => completionMatchesSelectedSeasons(item, filters))
	const seasonOrders = completions.filter(
		item =>
			!item.isTest &&
			item.serviceUsed !== false &&
			completionMatchesSelectedSeasons(item, filters)
	)
	const previous = previousSeason({ season: filters.primarySeason, year: filters.year })
	const previousSeasonCustomerIds = new Set(
		completions
			.filter(
				item =>
					item.customerId &&
					!item.isTest &&
					item.serviceUsed !== false &&
					completionMatchesSeason(item, previous.season, previous.year)
			)
			.map(item => item.customerId)
	)
	const currentSeasonCustomerIds = new Set(
		completions
			.filter(
				item =>
					item.customerId &&
					!item.isTest &&
					item.serviceUsed !== false &&
					completionMatchesSelectedSeasons(item, filters)
			)
			.map(item => item.customerId)
	)
	const withoutRepeatFromPrevious = Array.from(previousSeasonCustomerIds).filter(
		id => !currentSeasonCustomerIds.has(id)
	).length

	return {
		selectedSeasonLabel: filters.seasons
			.map(season => seasonPeriodLabel(season, filters.year))
			.join(' + '),
		previousSeasonLabel: seasonPeriodLabel(previous.season, previous.year),
		totalCustomers: activeRows.length,
		filteredCustomers: filteredRows.length,
		previousSeasonCustomers: previousSeasonCustomerIds.size,
		seasonCustomers: currentSeasonCustomerIds.size,
		seasonOrders: seasonOrders.length,
		repeatCustomers: activeRows.filter(row => row.repeatCustomer).length,
		customersWithStorage: activeRows.filter(row => row.hasStorage).length,
		withoutRepeatFromPrevious,
		totalRevenue: money(paid.reduce((sum, item) => sum + (item.amount || 0), 0)),
		seasonRevenue: money(seasonPaid.reduce((sum, item) => sum + (item.amount || 0), 0)),
		averageCheck: paid.length
			? money(paid.reduce((sum, item) => sum + (item.amount || 0), 0) / paid.length)
			: 0,
		seasonAverageCheck: seasonPaid.length
			? money(
					seasonPaid.reduce((sum, item) => sum + (item.amount || 0), 0) /
						seasonPaid.length
			  )
			: 0,
		ordersBySeason: Object.values(
			completions
				.filter(item => !item.isTest && item.serviceUsed !== false && item.completedAt)
				.reduce((acc, item) => {
					const date = new Date(item.completedAt)
					const season = seasonFromDate(date)
					const year = seasonYearFromDate(date)
					const key = `${year}-${season}`
					acc[key] ||= {
						key,
						year,
						season,
						label: seasonPeriodLabel(season, year),
						orders: 0,
						revenue: 0,
						items: [],
					}
					acc[key].orders += 1
					acc[key].revenue += item.amount || 0
					acc[key].items.push(serializeCompletion(item))
					return acc
				}, {})
		)
			.map(item => ({ ...item, revenue: money(item.revenue) }))
			.sort((a, b) => `${a.year}${a.season}`.localeCompare(`${b.year}${b.season}`)),
		statusCounts: CONTACT_STATUSES.map(status => ({
			status,
			count: activeRows.filter(row => row.contactStatus === status).length,
		})),
		sources: unique(activeRows.map(row => row.source)).sort(),
	}
}

function selectedSeasonOrders(completions, filters) {
	return completions
		.filter(
			item =>
				!item.isTest &&
				item.serviceUsed !== false &&
				completionMatchesSelectedSeasons(item, filters)
		)
		.map(item => serializeCompletion(item))
		.filter(item => {
			if (filters.source && item.source !== filters.source) return false
			if (filters.search) {
				const haystack = `${item.name} ${item.phone} ${item.services.join(' ')} ${
					item.car || ''
				}`.toLowerCase()
				if (!haystack.includes(filters.search.toLowerCase())) return false
			}
			return true
		})
		.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
}

export async function GET(req) {
	try {
		const filters = parseFilters(req)
		const customers = await db.customer.findMany({
			include: {
				completions: true,
				seasonStatuses: {
					where: { season: { in: filters.seasons }, year: filters.year },
				},
			},
			orderBy: { updatedAt: 'desc' },
		})
		const completions = await db.workOrderCompletion.findMany({
			where: { isTest: false },
		})

		const customerIds = new Set(customers.map(customer => customer.id))
		const allRows = [
			...customers.map(customer => aggregateCustomer(customer, filters)),
			...completions
				.filter(
					completion =>
						completion.customerId &&
						!customerIds.has(completion.customerId) &&
						!completion.isTest &&
						completion.serviceUsed !== false
				)
				.map(completion => aggregateDetachedCompletion(completion, filters)),
			...completions
				.filter(
					completion =>
						!completion.customerId &&
						!completion.isTest &&
						completion.serviceUsed !== false
				)
				.map(completion => aggregateDetachedCompletion(completion, filters)),
		]
		const filteredRows = applyFilters(allRows, filters).sort((a, b) => {
			if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent
			return new Date(b.lastOrderDate || 0) - new Date(a.lastOrderDate || 0)
		})

		return NextResponse.json({
			success: true,
			filters,
			overview: buildOverview(allRows, filteredRows, completions, filters),
			customers: filteredRows,
			selectedOrders: selectedSeasonOrders(completions, filters),
			statuses: CONTACT_STATUSES,
		})
	} catch (error) {
		console.error('GET /api/admin/season failed:', error)
		return NextResponse.json(
			{ success: false, error: error.message || 'Blad sezonu.' },
			{ status: 500 }
		)
	}
}

export async function PATCH(req) {
	try {
		const body = await req.json()
		const customerId = body?.customerId
		const season = body?.season
		const year = Number(body?.year)
		const status = body?.status

		if (!customerId || !season || !year || !CONTACT_STATUSES.includes(status)) {
			return NextResponse.json(
				{ success: false, error: 'Nieprawidlowe dane statusu.' },
				{ status: 400 }
			)
		}

		const saved = await db.customerSeasonStatus.upsert({
			where: { customerId_season_year: { customerId, season, year } },
			create: {
				customerId,
				season,
				year,
				status,
				note: body.note || null,
				lastContactAt: new Date(),
				nextContactAt: body.nextContactAt ? new Date(body.nextContactAt) : null,
			},
			update: {
				status,
				note: body.note || null,
				lastContactAt: new Date(),
				nextContactAt: body.nextContactAt ? new Date(body.nextContactAt) : null,
			},
		})

		return NextResponse.json({ success: true, data: saved })
	} catch (error) {
		console.error('PATCH /api/admin/season failed:', error)
		return NextResponse.json(
			{ success: false, error: error.message || 'Nie zapisano statusu.' },
			{ status: 500 }
		)
	}
}
