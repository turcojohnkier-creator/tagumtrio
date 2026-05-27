import { NavLink } from 'react-router-dom';

const links = [
	{ to: '/production', label: 'Dashboard' },
	{ to: '/production/batch-tracking', label: 'Batch Tracking' },
	{ to: '/production/worker-output', label: 'Worker Output' },
];

export default function ProductionSidebar() {
	return (
		<aside className="w-56 bg-neutral-800 p-4 flex flex-col gap-2 min-h-screen border-r border-neutral-700">
			<div className="text-xl font-bold mb-6 tracking-wide text-blue-300">Production</div>
			{links.map(link => (
				<NavLink
					key={link.to}
					to={link.to}
					className={({ isActive }) =>
						`block px-4 py-2 rounded hover:bg-neutral-700 transition ${isActive ? 'bg-neutral-700 text-blue-300' : 'text-gray-200'}`
					}
				>
					{link.label}
				</NavLink>
			))}
		</aside>
	);
}
