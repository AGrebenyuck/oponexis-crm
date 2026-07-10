import Link from 'next/link'

const navItems = [
	{ href: '/admin/services', label: 'Usługi' },
	{ href: '/admin/availability', label: 'Dostępność' },
	{ href: '/admin/promocodes', label: 'Promokody' },
	{ href: '/admin/season', label: 'Sezon' },
	{ href: '/admin/sms-campaigns', label: 'SMS kampanie' },
	{ href: '/admin/forms', label: 'Formularz' },
	{ href: '/admin/reservation', label: 'Nowa rezerwacja' },
	{ href: '/admin/events', label: 'Zlecenia' },
	{ href: '/admin/calendar', label: 'Kalendarz' },
]

export default function AdminShell({ children }) {
	return (
		<div className='min-h-screen text-[#132c43]'>
			<aside className='fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#132c43] px-4 py-5 text-white lg:block'>
				<Link href='/admin/services' className='block px-2 text-lg font-semibold'>
					Oponexis CRM
				</Link>
				<p className='mt-1 px-2 text-xs text-white/55'>Panel operacyjny</p>
				<nav className='mt-6 space-y-1'>
					{navItems.map(item => (
						<Link
							key={item.href}
							href={item.href}
							className='block rounded-md px-3 py-2 text-sm font-medium text-white/78 hover:bg-white/10 hover:text-white'
						>
							{item.label}
						</Link>
					))}
				</nav>
			</aside>

			<div className='lg:pl-64'>
				<header className='sticky top-0 z-10 border-b border-white/10 bg-[#132c43]/95 px-4 py-3 text-white backdrop-blur lg:hidden'>
					<div className='font-semibold'>Oponexis CRM</div>
					<nav className='mt-3 flex gap-2 overflow-x-auto pb-1'>
						{navItems.map(item => (
							<Link
								key={item.href}
								href={item.href}
								className='shrink-0 rounded-md border border-white/20 bg-white/8 px-3 py-1.5 text-sm text-white'
							>
								{item.label}
							</Link>
						))}
					</nav>
				</header>
				<main className='mx-auto max-w-7xl px-4 py-6 text-[#132c43] lg:px-8'>
					{children}
				</main>
			</div>
		</div>
	)
}
