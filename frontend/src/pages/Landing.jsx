import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Users, CreditCard, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-slate-900">
      {}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />

      {}
      <header className="relative max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Compass className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-linear-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Splitify
          </span>
        </div>
        <nav className="flex items-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
            >
              Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all shadow-lg shadow-emerald-500/25"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {}
      <main className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center z-10">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Split bills, track expenses,{' '}
          <span className="bg-linear-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
            minus the stress.
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
          Keep track of shared expenses with roommates, trips, and friends. Compute exact balances, split your way, and settle up in seconds.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          {user ? (
            <Link
              to="/dashboard"
              className="px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg transition-all shadow-xl shadow-emerald-500/30 hover:scale-[1.02]"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg transition-all shadow-xl shadow-emerald-500/30 hover:scale-[1.02]"
              >
                Get Started for Free
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-lg border border-slate-800 hover:border-slate-700 transition-all hover:scale-[1.02]"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-900 hover:border-emerald-500/30 hover:bg-slate-900/80 transition-all flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Group Management</h3>
            <p className="text-slate-400 leading-relaxed">
              Create groups for travel, shared houses, or casual outings. Invite or remove members easily.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-900 hover:border-emerald-500/30 hover:bg-slate-900/80 transition-all flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 mb-6">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Flexible Splits</h3>
            <p className="text-slate-400 leading-relaxed">
              Split bills equally, by percentage, by share, or input exact amounts. The choice is yours.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-900 hover:border-emerald-500/30 hover:bg-slate-900/80 transition-all flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Real-time Expense Chats</h3>
            <p className="text-slate-400 leading-relaxed">
              Discuss charges, clarify splits, and attach comments in a real-time chat room for each bill.
            </p>
          </div>
        </div>
      </main>

      {}
      <footer className="border-t border-slate-900 py-12 relative z-10 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
              <Compass className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="font-semibold text-slate-300">Splitify</span>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Splitify. Developed for Spreetail Assignment.
          </p>
        </div>
      </footer>
    </div>
  );
}
