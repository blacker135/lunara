// components/auth/AuthForm.tsx — 登录/注册表单组件

'use client';

import { useState, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

export function AuthForm() {
  const params = useParams<{ lang: string }>();
  const lang = params?.lang || 'en';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ name, email, password });
        if (error) {
          setMessage({ type: 'error', text: error.message || 'Sign up failed' });
        } else {
          setMessage({ type: 'success', text: 'Account created! Redirecting to sign in...' });
          setTimeout(() => {
            setIsSignUp(false);
            setMessage(null);
          }, 1500);
        }
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) {
          setMessage({ type: 'error', text: error.message || 'Sign in failed' });
        } else {
          window.location.href = `/${lang}/chat/liam`;
        }
      }
    } catch (err) {
      console.error('AuthForm submit error:', err);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[24px] bg-white p-8 shadow-soft">
        <h1 className="text-center text-2xl font-semibold text-text-primary">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          {isSignUp ? 'Start your journey with Lunara' : 'Sign in to continue your conversations'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {isSignUp && (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-primary">Name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-[18px] border border-gray-200 bg-[#FAF7F2] px-5 py-3 text-sm text-text-primary placeholder-gray-400 outline-none transition-all focus:border-[#FF7A59]/40 focus:ring-2 focus:ring-[#FF7A59]/10"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-[18px] border border-gray-200 bg-[#FAF7F2] px-5 py-3 text-sm text-text-primary placeholder-gray-400 outline-none transition-all focus:border-[#FF7A59]/40 focus:ring-2 focus:ring-[#FF7A59]/10"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              minLength={6}
              className="w-full rounded-[18px] border border-gray-200 bg-[#FAF7F2] px-5 py-3 text-sm text-text-primary placeholder-gray-400 outline-none transition-all focus:border-[#FF7A59]/40 focus:ring-2 focus:ring-[#FF7A59]/10"
            />
          </div>

          {message && (
            <div className={`rounded-[12px] px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[16px] bg-[#FF7A59] py-3 text-sm font-medium text-white transition-all hover:bg-[#FF7A59]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
            className="font-medium text-[#FF7A59] hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
