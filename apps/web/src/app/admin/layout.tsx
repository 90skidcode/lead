export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p className="text-yellow-800 font-medium">
            ⚠️ Super Admin Area - All actions are logged
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
