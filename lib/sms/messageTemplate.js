export function renderSmsTemplate(template, recipient) {
	return String(template || '')
		.replaceAll('{name}', recipient.name || '')
		.replaceAll('{phone}', recipient.phone || '')
		.replaceAll('{firstName}', String(recipient.name || '').split(/\s+/)[0] || '')
}
