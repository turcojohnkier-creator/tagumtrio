const batches = [
	{ id: 1, name: 'Batch 001', status: 'Active' },
	{ id: 2, name: 'Batch 002', status: 'Completed' },
];

export default function BatchTracking() {
	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Batch Tracking</h1>
			<table className="min-w-full bg-neutral-800 rounded-lg overflow-hidden">
				<thead>
					<tr className="bg-neutral-700">
						<th className="px-4 py-2 text-left">Batch Name</th>
						<th className="px-4 py-2 text-left">Status</th>
					</tr>
				</thead>
				<tbody>
					{batches.map((row) => (
						<tr key={row.id} className="border-b border-neutral-700">
							<td className="px-4 py-2">{row.name}</td>
							<td className={`px-4 py-2 font-semibold ${row.status === 'Active' ? 'text-green-400' : 'text-gray-400'}`}>{row.status}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
