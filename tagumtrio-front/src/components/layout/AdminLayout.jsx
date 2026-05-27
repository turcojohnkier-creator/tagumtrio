import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
	return (
		<div className="flex min-h-screen bg-neutral-900 text-gray-100">
			<AdminSidebar />
			<main className="flex-1 p-6 overflow-y-auto">
				{children}
			</main>
		</div>
	);
}
