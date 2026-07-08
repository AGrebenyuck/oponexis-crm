'use client'

export default function TextArea({ className = '', rows = 3, ...props }) {
	return <textarea rows={rows} className={`opx-input ${className}`} {...props} />
}
