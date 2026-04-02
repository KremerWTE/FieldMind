'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setAuthCookie } from '@/lib/auth-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function PinLogin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = async (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    setPin(digits);
    setError('');
    if (digits.length === 8) {
      await submit(digits);
    }
  };

  const submit = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Invalid PIN. Please try again.');
        setPin('');
        inputRef.current?.focus();
        return;
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthCookie();
      router.push('/dashboard');
    } catch {
      setError('Network error. Check that the API is running.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const dots = Array.from({ length: 8 }, (_, i) => i < pin.length);

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md text-center">
          {error}
        </div>
      )}

      <div className="flex justify-center gap-3 mb-6">
        {dots.map((filled, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              filled ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
            }`}
          />
        ))}
      </div>

      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={pin}
        onChange={(e) => handleChange(e.target.value)}
        maxLength={8}
        disabled={loading}
        className="sr-only"
        aria-label="8-digit PIN"
        autoComplete="one-time-code"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors mb-4"
      >
        {loading ? 'Signing in…' : pin.length === 0 ? 'Tap here, then type your PIN' : `${pin.length} of 8 digits entered`}
      </button>

      <div className="text-center">
        <Link href="/auth/forgot-pin" className="text-sm text-blue-600 hover:underline">
          Forgot PIN? Send a new one via SMS
        </Link>
      </div>
    </div>
  );
}

function EmailLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Invalid email or password.');
        return;
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthCookie();
      router.push('/dashboard');
    } catch {
      setError('Network error. Check that the API is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="text-center">
        <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<'email' | 'pin'>('email');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">FieldMind</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'email'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setTab('pin')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'pin'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            PIN
          </button>
        </div>

        {tab === 'email' ? <EmailLogin /> : <PinLogin />}

        <p className="text-center text-sm text-gray-500 mt-6">
          New to FieldMind?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
