import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Compass,
  LogOut,
  Plus,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  CircleDollarSign,
  FolderOpen,
  Search,
  X
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [modalError, setModalError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!newGroupName.trim()) {
      setModalError('Group name is required');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/groups', {
        name: newGroupName,
        description: newGroupDesc
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setModalOpen(false);
      await fetchGroups();
      navigate(`/groups/${res.data.id}`);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const youAreOwed = groups
    .filter(g => g.userNetBalance > 0)
    .reduce((sum, g) => sum + g.userNetBalance, 0);

  const youOwe = Math.abs(
    groups
      .filter(g => g.userNetBalance < 0)
      .reduce((sum, g) => sum + g.userNetBalance, 0)
  );

  const totalBalance = youAreOwed - youOwe;

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-slate-900">
      {}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Compass className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="font-bold tracking-tight text-slate-100">Splitify</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Keep track of your group accounts and settlements.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="self-start px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4 stroke-3" /> Create a Group
          </button>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-900 flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              totalBalance > 0.01
                ? 'bg-emerald-500/10 text-emerald-400'
                : totalBalance < -0.01
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-slate-800 text-slate-400'
            }`}>
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Net Balance</p>
              <h3 className={`text-2xl font-extrabold mt-0.5 ${
                totalBalance > 0.01
                  ? 'text-emerald-400'
                  : totalBalance < -0.01
                    ? 'text-rose-400'
                    : 'text-slate-300'
              }`}>
                {totalBalance > 0.01 ? '+' : ''}${totalBalance.toFixed(2)}
              </h3>
            </div>
          </div>

          {}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-900 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">You owe</p>
              <h3 className="text-2xl font-extrabold mt-0.5 text-rose-400">
                ${youOwe.toFixed(2)}
              </h3>
            </div>
          </div>

          {}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-900 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">You are owed</p>
              <h3 className="text-2xl font-extrabold mt-0.5 text-emerald-400">
                ${youAreOwed.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        {}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold tracking-tight">Your Groups</h2>

            {}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-emerald-500/50 outline-none text-slate-200 placeholder:text-slate-600 text-sm transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/20 border border-slate-900 border-dashed text-center flex flex-col items-center justify-center">
              <FolderOpen className="w-12 h-12 text-slate-700 mb-4" />
              <h4 className="text-lg font-bold text-slate-300">No groups found</h4>
              <p className="text-slate-500 text-sm max-w-sm mt-1">
                {search ? "No groups match your search query." : "You haven't joined any groups yet. Click 'Create a Group' to get started!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGroups.map(group => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="p-6 rounded-3xl bg-slate-900/30 border border-slate-900 hover:border-slate-800 hover:bg-slate-900/50 transition-all flex justify-between items-center group/card"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-slate-100 group-hover/card:text-emerald-400 transition-colors">
                      {group.name}
                    </h3>
                    <p className="text-slate-400 text-sm line-clamp-1">
                      {group.description || 'No description.'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{group.membersCount} member{group.membersCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="text-right pl-4 shrink-0">
                    {group.userNetBalance > 0.01 ? (
                      <div>
                        <p className="text-xs text-emerald-500/80 font-medium">you are owed</p>
                        <p className="font-extrabold text-emerald-400 text-lg">${group.userNetBalance.toFixed(2)}</p>
                      </div>
                    ) : group.userNetBalance < -0.01 ? (
                      <div>
                        <p className="text-xs text-rose-500/80 font-medium">you owe</p>
                        <p className="font-extrabold text-rose-400 text-lg">${Math.abs(group.userNetBalance).toFixed(2)}</p>
                      </div>
                    ) : (
                      <p className="text-slate-500 font-semibold text-sm">settled up</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => { setModalOpen(false); setModalError(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold tracking-tight mb-1">Create new group</h3>
            <p className="text-slate-400 text-sm mb-6">Setup a shared space to log trip or household expenses.</p>

            {modalError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Summer Vacation, Room 204"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 outline-none text-slate-100 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this group for?"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 outline-none text-slate-100 text-sm transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setModalError(''); }}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
