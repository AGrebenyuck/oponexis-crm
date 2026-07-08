import { NextResponse } from 'next/server'

export function proxy(request) {
	if (request.method === 'POST' && request.nextUrl.pathname === '/') {
		return NextResponse.rewrite(new URL('/api/telegram/webhook', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: '/',
}
