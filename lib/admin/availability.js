import { DateTime } from 'luxon'

const ZONE = 'Europe/Warsaw'

export const WEEKDAYS = [
	{ key: 'monday', label: 'Poniedziałek', enumValue: 'MONDAY' },
	{ key: 'tuesday', label: 'Wtorek', enumValue: 'TUESDAY' },
	{ key: 'wednesday', label: 'Środa', enumValue: 'WEDNESDAY' },
	{ key: 'thursday', label: 'Czwartek', enumValue: 'THURSDAY' },
	{ key: 'friday', label: 'Piątek', enumValue: 'FRIDAY' },
	{ key: 'saturday', label: 'Sobota', enumValue: 'SATURDAY' },
	{ key: 'sunday', label: 'Niedziela', enumValue: 'SUNDAY' },
]

export const DEFAULT_AVAILABILITY = {
	timeGap: 30,
	monday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
	tuesday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
	wednesday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
	thursday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
	friday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
	saturday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
	sunday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
}

export function calendarToAvailability(calendar) {
	if (!calendar) return DEFAULT_AVAILABILITY

	const availability = {
		...DEFAULT_AVAILABILITY,
		timeGap: calendar.timeGap || DEFAULT_AVAILABILITY.timeGap,
	}

	for (const weekday of WEEKDAYS) {
		const day = calendar.days?.find(item => item.day === weekday.enumValue)
		if (!day) continue

		availability[weekday.key] = {
			isAvailable: true,
			startTime: DateTime.fromJSDate(day.startTime, { zone: ZONE }).toFormat(
				'HH:mm'
			),
			endTime: DateTime.fromJSDate(day.endTime, { zone: ZONE }).toFormat(
				'HH:mm'
			),
		}
	}

	return availability
}

export function availabilityToCalendarDays(data) {
	const baseDate = DateTime.now().setZone(ZONE).toISODate()

	return WEEKDAYS.flatMap(weekday => {
		const day = data?.[weekday.key]
		if (!day?.isAvailable) return []

		return {
			day: weekday.enumValue,
			startTime: DateTime.fromISO(`${baseDate}T${day.startTime}:00`, {
				zone: ZONE,
			}).toJSDate(),
			endTime: DateTime.fromISO(`${baseDate}T${day.endTime}:00`, {
				zone: ZONE,
			}).toJSDate(),
		}
	})
}
