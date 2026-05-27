const payrolls = [
	{ id: 1, employee: 'Juan Dela Cruz', amount: 15000, status: 'Pending' },
	{ id: 2, employee: 'Maria Santos', amount: 14800, status: 'Approved' },
];

export default function PayrollProcessing() {
	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Payroll Processing</h1>
			<table className="min-w-full bg-neutral-800 rounded-lg overflow-hidden">
				<thead>
					<tr className="bg-neutral-700">
						<th className="px-4 py-2 text-left">Employee</th>
						<th className="px-4 py-2 text-left">Amount</th>
						<th className="px-4 py-2 text-left">Status</th>
					</tr>
				</thead>
				<tbody>
					{payrolls.map((row) => (
						<tr key={row.id} className="border-b border-neutral-700">
							<td className="px-4 py-2">{row.employee}</td>
							<td className="px-4 py-2">₱{row.amount.toLocaleString()}</td>
							<td className={`px-4 py-2 font-semibold ${row.status === 'Approved' ? 'text-green-400' : 'text-yellow-400'}`}>{row.status}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
