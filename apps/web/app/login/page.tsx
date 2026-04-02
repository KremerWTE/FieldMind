'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Invalid PIN. Please try again.');
        setPin('');
        inputRef.current?.focus();
        return;
      }

      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">FieldMind</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your 8-digit PIN</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md text-center">
            {error}
          </div>
        )}

        {/* PIN dot display */}
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

        {/* Hidden numeric input — focused to capture keystrokes */}
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

        {/* Tap-to-focus area for mobile */}
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
    </div>
  );
}
