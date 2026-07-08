'use client'

export default function Input({ className = '', ...props }) {
	return <input className={`opx-input ${className}`} {...props} />
}
