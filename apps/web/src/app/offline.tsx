export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.111 16.332a9 9 0 11-4.08-15.332m12 12l-3.42-3.42m3.42 3.42L9.586 9.586"
          />
        </svg>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">No Internet Connection</h1>
        <p className="mt-2 text-gray-600">
          You are currently offline. Some features may not be available until you reconnect.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Your data has been cached locally and will sync when you come back online.
        </p>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
          <h2 className="font-semibold text-blue-900 mb-2">What you can do:</h2>
          <ul className="text-sm text-blue-800 space-y-1 text-left">
            <li>• View previously loaded leads and contacts</li>
            <li>• Create notes and tasks offline</li>
            <li>• Update lead information locally</li>
            <li>• Changes will sync automatically online</li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
}
