import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';

const links = [
	{ to: '/production', label: 'Dashboard' },
	{ to: '/production/batch-tracking', label: 'Batch Tracking' },
	{ to: '/production/worker-output', label: 'Worker Output' },
];

export default function ProductionSidebar() {
	const [mobileOpen, setMobileOpen] = useState(false)
	return (
		<>
			{mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden pointer-events-auto" onClick={() => setMobileOpen(false)} />}
			<button onClick={() => setMobileOpen(!mobileOpen)} className="fixed bottom-4 right-4 z-50 md:hidden bg-neutral-700 p-2 rounded-lg"><Menu className="w-5 h-5" /></button>
			<aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-neutral-800 p-4 flex flex-col gap-2 border-r border-neutral-700 transition-transform duration-300 md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
				<div className="text-xl font-bold mb-6 tracking-wide text-blue-300">Production</div>
				{links.map(link => (
					<NavLink
						key={link.to}
						to={link.to}
						onClick={() => setMobileOpen(false)}
						className={({ isActive }) =>
							`block px-4 py-2 rounded hover:bg-neutral-700 transition ${isActive ? 'bg-neutral-700 text-blue-300' : 'text-gray-200'}`
						}
					>
						{link.label}
					</NavLink>
				))}
			</aside>
		</>
	);
}
