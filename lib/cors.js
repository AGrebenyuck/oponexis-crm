import { NextResponse } from 'next/server'

const DEFAULT_METHODS = 'GET, POST, PUT, DELETE, OPTIONS'

export function corsHeaders(methods = DEFAULT_METHODS) {
	return {
		'Access-Control-Allow-Origin': process.env.PUBLIC_SITE_ORIGIN || '*',
		'Access-Control-Allow-Methods': methods,
		'Access-Control-Allow-Headers': 'Content-Type',
	}
}

export function jsonCors(data, init = {}) {
	return NextResponse.json(data, {
		...init,
		headers: {
			...corsHeaders(),
			...(init.headers || {}),
		},
	})
}

export function optionsCors(methods = DEFAULT_METHODS) {
	return new NextResponse(null, {
		status: 204,
		headers: corsHeaders(methods),
	})
}
