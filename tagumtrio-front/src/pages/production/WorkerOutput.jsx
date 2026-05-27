const outputs = [
	{ id: 1, worker: 'Juan Dela Cruz', output: 120, status: 'Good' },
	{ id: 2, worker: 'Maria Santos', output: 110, status: 'Good' },
	{ id: 3, worker: 'Pedro Reyes', output: 90, status: 'Needs Improvement' },
];

export default function WorkerOutput() {
	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Worker Output</h1>
			<table className="min-w-full bg-neutral-800 rounded-lg overflow-hidden">
				<thead>
					<tr className="bg-neutral-700">
						<th className="px-4 py-2 text-left">Worker</th>
						<th className="px-4 py-2 text-left">Output</th>
						<th className="px-4 py-2 text-left">Status</th>
					</tr>
				</thead>
				<tbody>
					{outputs.map((row) => (
						<tr key={row.id} className="border-b border-neutral-700">
							<td className="px-4 py-2">{row.worker}</td>
							<td className="px-4 py-2">{row.output}</td>
							<td className={`px-4 py-2 font-semibold ${row.status === 'Good' ? 'text-green-400' : 'text-yellow-400'}`}>{row.status}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
