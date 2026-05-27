import ProductionSidebar from './ProductionSidebar';

export default function ProductionLayout({ children }) {
	return (
		<div className="flex min-h-screen bg-neutral-900 text-gray-100">
			<ProductionSidebar />
			<main className="flex-1 p-6 overflow-y-auto">
				{children}
			</main>
		</div>
	);
}
