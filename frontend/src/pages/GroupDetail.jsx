import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import {
  Compass,
  ArrowLeft,
  UserPlus,
  Plus,
  Trash2,
  CheckCircle,
  MessageSquare,
  Users,
  DollarSign,
  AlertTriangle,
  Receipt,
  X,
  UserCheck
} from 'lucide-react';

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { joinGroupRoom, leaveGroupRoom, onGroupUpdated, offGroupUpdated } = useSocket();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [memberError, setMemberError] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const [settleOpen, setSettleOpen] = useState(false);
  const [settlePayer, setSettlePayer] = useState('');
  const [settlePayee, setSettlePayee] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleError, setSettleError] = useState('');
  const [settling, setSettling] = useState(false);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPayer, setExpPayer] = useState('');
  const [expSplitType, setExpSplitType] = useState('EQUAL');

  const [equalChecked, setEqualChecked] = useState({});
  const [unequalValues, setUnequalValues] = useState({});
  const [percentValues, setPercentValues] = useState({});
  const [shareValues, setShareValues] = useState({});

  const [expenseError, setExpenseError] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get(`/groups/${groupId}`);
      setData(res.data);
      if (res.data.members && res.data.members.length > 0) {
        const userInGroup = res.data.members.find(m => m.user.id === user.id);
        const defaultPayerId = userInGroup ? user.id : res.data.members[0].user.id;
        setExpPayer(defaultPayerId);
        setSettlePayer(defaultPayerId);

        const initialChecked = {};
        const initialZeroes = {};
        const initialOnes = {};
        res.data.members.forEach(m => {
          initialChecked[m.user.id] = true;
          initialZeroes[m.user.id] = '';
          initialOnes[m.user.id] = '1';
        });
        setEqualChecked(initialChecked);
        setUnequalValues(initialZeroes);
        setPercentValues(initialZeroes);
        setShareValues(initialOnes);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    joinGroupRoom(groupId);

    const handleGroupUpdated = () => {
      console.log('Group updated in real-time, fetching latest data...');
      fetchData();
    };

    onGroupUpdated(handleGroupUpdated);

    return () => {
      leaveGroupRoom(groupId);
      offGroupUpdated(handleGroupUpdated);
    };
  }, [groupId]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    if (!inviteEmail.trim()) return;

    setAddingMember(true);
    try {
      await api.post(`/groups/${groupId}/members`, { email: inviteEmail });
      setInviteEmail('');
      await fetchData();
    } catch (err) {
      setMemberError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.delete(`/groups/${groupId}/members/${targetUserId}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  const handleSettleUp = async (e) => {
    e.preventDefault();
    setSettleError('');
    if (!settlePayer || !settlePayee || !settleAmount) {
      setSettleError('All fields are required');
      return;
    }
    if (settlePayer === settlePayee) {
      setSettleError('Payer and recipient cannot be the same person');
      return;
    }
    if (Number(settleAmount) <= 0) {
      setSettleError('Amount must be greater than zero');
      return;
    }

    setSettling(true);
    try {
      await api.post('/settlements', {
        groupId,
        payerId: settlePayer,
        payeeId: settlePayee,
        amount: Number(settleAmount)
      });
      setSettleAmount('');
      setSettleOpen(false);
      await fetchData();
    } catch (err) {
      setSettleError(err.response?.data?.error || 'Failed to record settlement');
    } finally {
      setSettling(false);
    }
  };

  const prefillSettlement = (fromId, toId, amount) => {
    setSettlePayer(fromId);
    setSettlePayee(toId);
    setSettleAmount(amount.toString());
    setSettleOpen(true);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setExpenseError('');
    if (!expDesc.trim() || !expAmount || !expPayer) {
      setExpenseError('Please fill in description, amount, and payer');
      return;
    }

    const totalAmt = Number(expAmount);
    if (isNaN(totalAmt) || totalAmt <= 0) {
      setExpenseError('Please enter a valid amount greater than zero');
      return;
    }

    let splitsData = [];

    if (expSplitType === 'EQUAL') {
      const selectedIds = Object.keys(equalChecked).filter(id => equalChecked[id]);
      if (selectedIds.length === 0) {
        setExpenseError('Please select at least one member to split with');
        return;
      }
      splitsData = selectedIds.map(userId => ({ userId }));

    } else if (expSplitType === 'UNEQUAL') {
      let sum = 0;
      splitsData = data.members.map(m => {
        const amt = Number(unequalValues[m.user.id]) || 0;
        sum += amt;
        return { userId: m.user.id, amount: amt };
      });

      if (Math.abs(sum - totalAmt) > 0.02) {
        setExpenseError(`Total of split amounts ($${sum.toFixed(2)}) must equal expense amount ($${totalAmt.toFixed(2)})`);
        return;
      }

    } else if (expSplitType === 'PERCENTAGE') {
      let percentSum = 0;
      splitsData = data.members.map(m => {
        const pct = Number(percentValues[m.user.id]) || 0;
        percentSum += pct;
        return { userId: m.user.id, percent: pct };
      });

      if (Math.abs(percentSum - 100) > 0.01) {
        setExpenseError(`Total percentage must equal exactly 100% (currently ${percentSum}%)`);
        return;
      }

    } else if (expSplitType === 'SHARE') {
      let sharesSum = 0;
      splitsData = data.members.map(m => {
        const sh = parseInt(shareValues[m.user.id]) || 0;
        sharesSum += sh;
        return { userId: m.user.id, share: sh };
      });

      if (sharesSum <= 0) {
        setExpenseError('Total shares must be greater than zero');
        return;
      }
    }

    setAddingExpense(true);
    try {
      await api.post('/expenses', {
        groupId,
        description: expDesc,
        amount: totalAmt,
        payerId: expPayer,
        splitType: expSplitType,
        splits: splitsData
      });

      setExpDesc('');
      setExpAmount('');
      setExpenseOpen(false);
      await fetchData();
    } catch (err) {
      setExpenseError(err.response?.data?.error || 'Failed to add expense');
    } finally {
      setAddingExpense(false);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportError('');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setImporting(true);
        const text = event.target.result;
        const res = await api.post('/expenses/import-preview', {
          groupId,
          csvText: text
        });
        setPreviewData(res.data.parsedRows);
      } catch (err) {
        console.error(err);
        setImportError(err.response?.data?.error || 'Failed to parse CSV file');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!previewData || previewData.length === 0) return;
    setImporting(true);
    setImportError('');
    try {
      await api.post('/expenses/import-confirm', {
        groupId,
        rows: previewData
      });
      setPreviewData(null);
      setImportOpen(false);
      setImportSuccess('CSV data imported successfully!');
      setTimeout(() => setImportSuccess(''), 5000);
      await fetchData();
    } catch (err) {
      console.error(err);
      setImportError(err.response?.data?.error || 'Failed to import CSV data');
    } finally {
      setImporting(false);
    }
  };

  const toggleRowShouldImport = (index) => {
    setPreviewData(prev => prev.map(row => 
      row.index === index ? { ...row, shouldImport: !row.shouldImport } : row
    ));
  };

  const updateRowField = (index, field, value) => {
    setPreviewData(prev => prev.map(row => 
      row.index === index ? { ...row, [field]: value } : row
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-xl font-bold">{error || 'Group not found'}</h3>
        <Link to="/dashboard" className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const { group, members, expenses, settlements, debts } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-slate-900 pb-20">
      {}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-400">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
              <Compass className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="font-bold tracking-tight text-slate-200">Splitify</span>
          </div>
        </div>
      </header>

      {}
      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {}
        <div className="lg:col-span-2 space-y-8">
          {}
          <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-900 backdrop-blur-md">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">{group.name}</h1>
            <p className="text-slate-400 text-sm mt-2">{group.description || 'No description provided.'}</p>

            {importSuccess && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                {importSuccess}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => setExpenseOpen(true)}
                className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/15 flex items-center gap-1.5 hover:scale-[1.01]"
              >
                <Plus className="w-4 h-4 stroke-3" /> Add an Expense
              </button>
              <button
                onClick={() => setSettleOpen(true)}
                className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-semibold text-sm transition-all flex items-center gap-1.5 hover:scale-[1.01]"
              >
                <CheckCircle className="w-4 h-4" /> Settle Up
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-sm transition-all flex items-center gap-1.5 hover:scale-[1.01]"
              >
                <Compass className="w-4 h-4 text-emerald-400" /> Import CSV
              </button>
            </div>
          </div>

          {}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight px-1 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" /> Expense History
            </h2>

            {expenses.length === 0 ? (
              <div className="p-12 rounded-3xl bg-slate-900/10 border border-slate-900 border-dashed text-center flex flex-col items-center justify-center">
                <DollarSign className="w-10 h-10 text-slate-700 mb-4" />
                <h4 className="font-bold text-slate-400">No expenses logged yet</h4>
                <p className="text-slate-600 text-sm mt-1">Get started by adding an expense split with your friends.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map(exp => {
                  const mySplit = exp.splits.find(s => s.userId === user.id);
                  const isPayer = exp.payerId === user.id;

                  return (
                    <div
                      key={exp.id}
                      className="p-5 rounded-3xl bg-slate-900/20 border border-slate-900 hover:border-slate-800 transition-all flex items-center justify-between gap-4"
                    >
                      <Link to={`/groups/${groupId}/expenses/${exp.id}`} className="flex-1 min-w-0 flex items-start gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-slate-400 font-bold">
                          {exp.description[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-100 truncate hover:text-emerald-400 transition-colors">
                            {exp.description}
                          </h4>
                          <p className="text-slate-500 text-xs mt-1">
                            Paid by <span className="font-semibold text-slate-400">{exp.payer.name}</span> &bull; {new Date(exp.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>

                      {}
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total</p>
                        <p className="font-extrabold text-slate-200">${exp.amount.toFixed(2)}</p>
                      </div>

                      {}
                      <div className="text-right shrink-0 hidden sm:block min-w-24">
                        {isPayer ? (
                          <div>
                            <p className="text-xs text-emerald-500/80 font-medium">you lent</p>
                            <p className="font-bold text-emerald-400">
                              ${(exp.amount - (mySplit ? mySplit.amount : 0)).toFixed(2)}
                            </p>
                          </div>
                        ) : mySplit ? (
                          <div>
                            <p className="text-xs text-rose-500/80 font-medium">you borrowed</p>
                            <p className="font-bold text-rose-400">${mySplit.amount.toFixed(2)}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 font-semibold">not involved</p>
                        )}
                      </div>

                      {}
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/groups/${groupId}/expenses/${exp.id}`}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition-all"
                          title="Expense Chat"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-955/20 transition-all"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {}
          {settlements.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-bold tracking-tight px-1 text-slate-300">Recorded Settlements</h3>
              <div className="space-y-2.5">
                {settlements.map(set => (
                  <div key={set.id} className="p-4 rounded-2xl bg-slate-900/10 border border-slate-900/60 text-sm text-slate-400 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">{set.payer.name}</span>
                      <span> paid </span>
                      <span className="font-semibold text-slate-200">{set.payee.name}</span>
                      <span className="text-xs text-slate-500"> &bull; {new Date(set.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="font-extrabold text-emerald-400">${set.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {}
        <div className="space-y-8">
          {}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-900 backdrop-blur-md">
            <h3 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Group Members
            </h3>

            {}
            <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
              <input
                type="email"
                required
                placeholder="Invite by email..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 outline-none text-xs text-slate-200 placeholder:text-slate-600 transition-all"
              />
              <button
                type="submit"
                disabled={addingMember}
                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shrink-0 disabled:opacity-50"
                title="Add Member"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            {memberError && (
              <p className="text-xs text-rose-400 mb-4 px-1">{memberError}</p>
            )}

            {}
            <div className="space-y-4">
              {members.map(m => (
                <div key={m.user.id} className="flex items-center justify-between gap-3 text-sm border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate flex items-center gap-1">
                      {m.user.name}
                      {m.user.id === user.id && <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500 font-medium">You</span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                  </div>

                  <div className="text-right flex items-center gap-3 shrink-0">
                    <div>
                      {m.netBalance > 0.01 ? (
                        <span className="font-semibold text-emerald-400 text-xs">+{m.netBalance.toFixed(2)}</span>
                      ) : m.netBalance < -0.01 ? (
                        <span className="font-semibold text-rose-400 text-xs">{m.netBalance.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-600 text-xs">settled</span>
                      )}
                    </div>
                    {m.user.id !== user.id && (
                      <button
                        onClick={() => handleRemoveMember(m.user.id)}
                        className="p-1 rounded-md text-slate-600 hover:text-rose-400 hover:bg-rose-955/15 transition-all"
                        title="Remove Member"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-900 backdrop-blur-md">
            <h3 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" /> Settle Up Plan
            </h3>

            {debts.length === 0 ? (
              <p className="text-slate-500 text-sm py-2">Everyone is completely settled up!</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed mb-1">
                  Click a balance card to automatically record a payment.
                </p>
                {debts.map((debt, index) => (
                  <button
                    key={index}
                    onClick={() => prefillSettlement(debt.from.id, debt.to.id, debt.amount)}
                    className="w-full text-left p-3.5 rounded-2xl bg-slate-950 border border-slate-850 hover:border-emerald-500/30 hover:bg-slate-900/50 transition-all flex items-center justify-between text-xs group"
                  >
                    <div className="space-y-1">
                      <p className="text-slate-400">
                        <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{debt.from.name}</span>
                        <span> owes </span>
                        <span className="font-bold text-slate-200">{debt.to.name}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 truncate max-w-40">{debt.from.email}</p>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <p className="font-extrabold text-rose-400 text-sm">${debt.amount.toFixed(2)}</p>
                      <span className="text-[9px] text-slate-500 group-hover:text-emerald-400 font-semibold transition-colors">Settle &rarr;</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {}
      {settleOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => { setSettleOpen(false); setSettleError(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold tracking-tight mb-1">Record a payment</h3>
            <p className="text-slate-400 text-sm mb-6">Select members and amount to log a payment settlement.</p>

            {settleError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {settleError}
              </div>
            )}

            <form onSubmit={handleSettleUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Who paid?
                </label>
                <select
                  value={settlePayer}
                  onChange={(e) => setSettlePayer(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 outline-none text-slate-200 text-sm"
                >
                  <option value="" disabled>Select payer</option>
                  {members.map(m => (
                    <option key={m.user.id} value={m.user.id}>{m.user.name} ({m.user.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Who received?
                </label>
                <select
                  value={settlePayee}
                  onChange={(e) => setSettlePayee(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 outline-none text-slate-200 text-sm"
                >
                  <option value="" disabled>Select payee</option>
                  {members.map(m => (
                    <option key={m.user.id} value={m.user.id}>{m.user.name} ({m.user.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/60 outline-none text-slate-100 text-sm transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setSettleOpen(false); setSettleError(''); }}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {settling ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {expenseOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => { setExpenseOpen(false); setExpenseError(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold tracking-tight mb-1">Add an expense</h3>
            <p className="text-slate-400 text-sm mb-6">Create a shared bill transaction split between members.</p>

            {expenseError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {expenseError}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="e.g. Dinner, Cab fare"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 outline-none text-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 outline-none text-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Who paid?
                  </label>
                  <select
                    value={expPayer}
                    onChange={(e) => setExpPayer(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 outline-none text-slate-200 text-sm"
                  >
                    {members.map(m => (
                      <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Split Method
                  </label>
                  <select
                    value={expSplitType}
                    onChange={(e) => setExpSplitType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 outline-none text-slate-200 text-sm"
                  >
                    <option value="EQUAL">Split Equally</option>
                    <option value="UNEQUAL">Unequal (Exact Amounts)</option>
                    <option value="PERCENTAGE">By Percentage</option>
                    <option value="SHARE">By Share Ratio</option>
                  </select>
                </div>
              </div>

              {}
              <div className="border-t border-slate-800/60 pt-4 mt-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Split Rules</p>

                {}
                {expSplitType === 'EQUAL' && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {members.map(m => (
                      <label key={m.user.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-900 hover:border-slate-800/80 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={equalChecked[m.user.id] || false}
                            onChange={(e) => setEqualChecked({
                              ...equalChecked,
                              [m.user.id]: e.target.checked
                            })}
                            className="w-4 h-4 rounded text-emerald-500 border-slate-800 accent-emerald-500 focus:ring-emerald-500/30"
                          />
                          <span className="text-sm font-medium text-slate-200">{m.user.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {equalChecked[m.user.id]
                            ? `$${(Number(expAmount || 0) / Math.max(1, Object.values(equalChecked).filter(Boolean).length)).toFixed(2)}`
                            : '$0.00'
                          }
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {}
                {expSplitType === 'UNEQUAL' && (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {members.map(m => (
                      <div key={m.user.id} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-300 font-medium truncate">{m.user.name}</span>
                        <div className="flex items-center gap-2 relative">
                          <span className="text-xs text-slate-600 absolute left-3">$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={unequalValues[m.user.id] || ''}
                            onChange={(e) => setUnequalValues({
                              ...unequalValues,
                              [m.user.id]: e.target.value
                            })}
                            className="w-28 pl-6 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-850 text-right text-xs text-slate-200 outline-none focus:border-emerald-500/40"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-[11px] text-slate-500">
                      Total split amount:{' '}
                      <span className="font-semibold text-slate-400">
                        ${Object.values(unequalValues).reduce((sum, v) => sum + (Number(v) || 0), 0).toFixed(2)}
                      </span>{' '}
                      / ${Number(expAmount || 0).toFixed(2)}
                    </div>
                  </div>
                )}

                {}
                {expSplitType === 'PERCENTAGE' && (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {members.map(m => (
                      <div key={m.user.id} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-300 font-medium truncate">{m.user.name}</p>
                          <p className="text-[10px] text-slate-600">
                            Calculated: ${( (Number(percentValues[m.user.id] || 0) / 100) * Number(expAmount || 0) ).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 relative">
                          <input
                            type="number"
                            placeholder="0"
                            value={percentValues[m.user.id] || ''}
                            onChange={(e) => setPercentValues({
                              ...percentValues,
                              [m.user.id]: e.target.value
                            })}
                            className="w-20 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-850 text-right text-xs text-slate-200 outline-none focus:border-emerald-500/40"
                          />
                          <span className="text-xs text-slate-600">%</span>
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-[11px] text-slate-500">
                      Total percentage:{' '}
                      <span className="font-semibold text-slate-400">
                        {Object.values(percentValues).reduce((sum, v) => sum + (Number(v) || 0), 0)}%
                      </span>{' '}
                      / 100%
                    </div>
                  </div>
                )}

                {}
                {expSplitType === 'SHARE' && (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {members.map(m => {
                      const totalShares = Object.values(shareValues).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
                      const userShares = parseInt(shareValues[m.user.id]) || 0;
                      const calculatedShare = totalShares > 0 ? (userShares / totalShares) * Number(expAmount || 0) : 0;

                      return (
                        <div key={m.user.id} className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm text-slate-300 font-medium truncate">{m.user.name}</p>
                            <p className="text-[10px] text-slate-600">Calculated: ${calculatedShare.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="1"
                              value={shareValues[m.user.id] || ''}
                              onChange={(e) => setShareValues({
                                ...shareValues,
                                [m.user.id]: e.target.value
                              })}
                              className="w-20 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-850 text-right text-xs text-slate-200 outline-none focus:border-emerald-500/40"
                            />
                            <span className="text-xs text-slate-650">share(s)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => { setExpenseOpen(false); setExpenseError(''); }}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingExpense}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {addingExpense ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => { setImportOpen(false); setPreviewData(null); setImportError(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold tracking-tight mb-1">Import Expenses</h3>
            <p className="text-slate-400 text-sm mb-6">Upload expenses_export.csv to parse and review group data.</p>

            {importError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {importError}
              </div>
            )}

            {!previewData ? (
              <div className="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center bg-slate-950/20">
                <Compass className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-300">Select your Splitwise CSV export</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Make sure it matches the standard Spreetail CSV structure.</p>
                <label className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-md">
                  Browse File
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleCSVUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-3">
                  <p>
                    Parsed <span className="font-bold text-slate-200">{previewData.length}</span> rows. Review and toggle rows to import.
                  </p>
                  <button 
                    onClick={() => setPreviewData(prev => prev.map(r => ({ ...r, shouldImport: true })))}
                    className="text-emerald-400 font-semibold hover:underline"
                  >
                    Select All
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1.5">
                  {previewData.map(row => (
                    <div 
                      key={row.index}
                      className={`p-4 rounded-2xl border text-xs transition-all ${
                        !row.shouldImport 
                          ? 'bg-slate-950/20 border-slate-900 opacity-55' 
                          : row.anomalies.length > 0 
                            ? 'bg-amber-500/5 border-amber-500/20' 
                            : 'bg-slate-950/40 border-slate-850'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                          <input 
                            type="checkbox"
                            checked={row.shouldImport}
                            onChange={() => toggleRowShouldImport(row.index)}
                            className="w-4 h-4 rounded text-emerald-500 border-slate-800 accent-emerald-500"
                          />
                          Row #{row.index}: {row.description || '(No Description)'}
                        </label>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-slate-100">${parseFloat(row.amount).toFixed(2)}</span>
                          <span className="text-[10px] text-slate-500 block">{row.currency}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-slate-400 mb-2">
                        <div>
                          <span className="text-slate-550 block text-[9px] uppercase font-bold mb-1">Payer</span>
                          <input 
                            type="text"
                            value={row.paidBy}
                            onChange={(e) => updateRowField(row.index, 'paidBy', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] outline-none text-slate-200"
                          />
                        </div>
                        <div>
                          <span className="text-slate-550 block text-[9px] uppercase font-bold mb-1">Split With</span>
                          <span className="text-[10px] text-slate-300 block truncate" title={row.splitWith.join('; ')}>
                            {row.splitWith.join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500 border-t border-slate-900/60 pt-2 mt-2">
                        <div>
                          <span className="font-semibold text-slate-600">Date:</span> {row.date}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600">Type:</span> {row.splitType || 'SETTLEMENT'}
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer ml-auto text-[10px] text-slate-400 hover:text-slate-350">
                          <input 
                            type="checkbox"
                            checked={row.isSettlement}
                            onChange={(e) => updateRowField(row.index, 'isSettlement', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-emerald-500 border-slate-800"
                          />
                          Is Settlement
                        </label>
                      </div>

                      {row.anomalies.length > 0 && (
                        <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/10 space-y-1">
                          <p className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> Anomalies Detected:
                          </p>
                          {row.anomalies.map((an, i) => (
                            <p key={i} className="text-[10px] text-slate-300 leading-tight">
                              &bull; {an.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => { setPreviewData(null); setImportError(''); }}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 font-semibold text-sm transition-all"
                  >
                    Reset Upload
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing || previewData.filter(r => r.shouldImport).length === 0}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : `Confirm Import (${previewData.filter(r => r.shouldImport).length} rows)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
