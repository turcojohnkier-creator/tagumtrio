export default function HRDashboard() {
	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">HR Dashboard</h1>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-neutral-800 rounded-lg p-6 shadow text-center">
					<div className="text-lg font-semibold mb-2">Pending Leave Requests</div>
					<div className="text-4xl font-bold text-blue-300 mb-2">3</div>
				</div>
				<div className="bg-neutral-800 rounded-lg p-6 shadow text-center">
					<div className="text-lg font-semibold mb-2">Payrolls to Process</div>
					<div className="text-4xl font-bold text-green-300 mb-2">2</div>
				</div>
				<div className="bg-neutral-800 rounded-lg p-6 shadow text-center">
					<div className="text-lg font-semibold mb-2">Employee Directory</div>
					<div className="text-4xl font-bold text-purple-300 mb-2">54</div>
				</div>
			</div>
		</div>
	);
}
