const workforce = [
	{ id: 1, name: 'Juan Dela Cruz', department: 'Production', status: 'Active' },
	{ id: 2, name: 'Maria Santos', department: 'HR', status: 'Active' },
	{ id: 3, name: 'Pedro Reyes', department: 'Finance', status: 'Inactive' },
];

export default function Workforce() {
	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Workforce</h1>
			<table className="min-w-full bg-neutral-800 rounded-lg overflow-hidden">
				<thead>
					<tr className="bg-neutral-700">
						<th className="px-4 py-2 text-left">Name</th>
						<th className="px-4 py-2 text-left">Department</th>
						<th className="px-4 py-2 text-left">Status</th>
					</tr>
				</thead>
				<tbody>
					{workforce.map((row) => (
						<tr key={row.id} className="border-b border-neutral-700">
							<td className="px-4 py-2">{row.name}</td>
							<td className="px-4 py-2">{row.department}</td>
							<td className={`px-4 py-2 font-semibold ${row.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>{row.status}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
