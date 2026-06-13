import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-center items-center px-6 relative selection:bg-emerald-500 selection:text-slate-900">
      {}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {}
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 hover:opacity-95 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Compass className="w-5.5 h-5.5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-linear-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Splitify
          </span>
        </Link>

        {}
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-900 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight text-center">Welcome Back</h2>
          <p className="text-slate-400 text-sm text-center mt-1.5">Sign in to track and split expenses.</p>

          {error && (
            <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 outline-none text-slate-100 placeholder:text-slate-600 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 outline-none text-slate-100 placeholder:text-slate-600 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
