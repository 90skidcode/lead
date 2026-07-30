'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [error] = useState<string>('');
  const [loading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-gray-600 mt-2">Get started with Lead Management</p>
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {error && <div className="p-3 bg-red-50 text-red-800 rounded">{error}</div>}

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className="w-full px-3 py-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tenant Name</label>
          <input type="text" className="w-full px-3 py-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" className="w-full px-3 py-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm Password</label>
          <input type="password" className="w-full px-3 py-2 border rounded" />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
