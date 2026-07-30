export default function AdminPage() {
  return (
    <div className="py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform management and monitoring</p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Tenants</h3>
          <p className="text-2xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Active Users</h3>
          <p className="text-2xl font-bold mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
