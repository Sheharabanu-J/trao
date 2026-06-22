'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Register failed');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-2">Register</h2>
        <p className="text-sm text-slate-400 mb-6">Create your private travel planning account.</p>

        <label className="block text-sm text-slate-300 mb-1">Email</label>
        <input
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-indigo-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <label className="block text-sm text-slate-300 mb-1">Password</label>
        <input
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-indigo-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          minLength={6}
        />

        {error && <div className="text-sm text-red-400 mb-4">{error}</div>}

        <button
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50 text-white rounded-lg px-4 py-2 font-semibold"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <div className="text-center text-sm text-slate-400 mt-4">
          Already have an account? <a className="text-indigo-300 hover:underline" href="/login">Login</a>
        </div>
      </form>
    </div>
  );
}

