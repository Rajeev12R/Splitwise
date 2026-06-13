import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import api from '../services/api';
import {
  Compass,
  ArrowLeft,
  Send,
  MessageCircle,
  Receipt,
  User,
  ArrowRight,
  Info
} from 'lucide-react';

export default function ExpenseDetail() {
  const { groupId, expenseId } = useParams();
  const { user } = useAuth();
  const {
    joinExpenseRoom,
    leaveExpenseRoom,
    onCommentReceived,
    offCommentReceived
  } = useSocket();

  const [expense, setExpense] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  const fetchExpenseDetails = async () => {
    try {
      const res = await api.get(`/groups/${groupId}`);
      const foundExp = res.data.expenses.find(e => e.id === expenseId);
      if (!foundExp) {
        setError('Expense not found');
        return;
      }
      setExpense(foundExp);

      const commentsRes = await api.get(`/comments/${expenseId}`);
      setComments(commentsRes.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseDetails();

    joinExpenseRoom(expenseId);

    const handleNewComment = (comment) => {
      setComments(prev => {
        if (prev.some(c => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    };

    onCommentReceived(handleNewComment);

    return () => {
      leaveExpenseRoom(expenseId);
      offCommentReceived(handleNewComment);
    };
  }, [expenseId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const messageContent = newComment.trim();
    setNewComment('');

    try {
      const res = await api.post('/comments', {
        expenseId,
        content: messageContent
      });

      setComments(prev => {
        if (prev.some(c => c.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6">
        <h3 className="text-xl font-bold text-rose-500">{error || 'Expense not found'}</h3>
        <Link to={`/groups/${groupId}`} className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Group
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-slate-900 pb-20">
      {}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={`/groups/${groupId}`} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-400">Back to Group</span>
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
        <div className="space-y-6 lg:col-span-1">
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-900 backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
              <Receipt className="w-6 h-6" />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">{expense.description}</h1>
            <p className="text-4xl font-black text-emerald-400 mt-2">${expense.amount.toFixed(2)}</p>

            <div className="border-t border-slate-800/60 pt-4 mt-6 space-y-3">
              <p className="text-xs text-slate-500">
                Paid by <span className="font-semibold text-slate-400">{expense.payer.name}</span>
              </p>
              <p className="text-xs text-slate-500">
                Date: <span className="font-semibold text-slate-400">{new Date(expense.createdAt).toLocaleDateString()}</span>
              </p>
              <p className="text-xs text-slate-500">
                Split Mode: <span className="font-semibold text-slate-400 capitalize">{expense.splitType.toLowerCase()}</span>
              </p>
            </div>
          </div>

          {}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-900 backdrop-blur-md">
            <h3 className="text-base font-bold tracking-tight mb-4 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-400" /> Split Details
            </h3>

            <div className="space-y-3.5">
              {expense.splits.map(split => (
                <div key={split.id} className="flex justify-between items-center text-sm border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{split.user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{split.user.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-slate-300">${split.amount.toFixed(2)}</p>
                    {expense.splitType === 'PERCENTAGE' && split.percent && (
                      <span className="text-[10px] text-slate-500">{split.percent}%</span>
                    )}
                    {expense.splitType === 'SHARE' && split.share && (
                      <span className="text-[10px] text-slate-500">{split.share} share(s)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {}
        <div className="lg:col-span-2 flex flex-col h-[550px] p-6 rounded-3xl bg-slate-900/40 border border-slate-900 backdrop-blur-md relative">

          {}
          <div className="flex items-center gap-2.5 border-b border-slate-900 pb-4 mb-4 shrink-0">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold tracking-tight text-slate-100">Discussion Room</h3>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Live updates
            </span>
          </div>

          {}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
            {comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <MessageCircle className="w-8 h-8 text-slate-800 mb-2" />
                <p className="text-slate-500 text-sm font-semibold">No comments yet</p>
                <p className="text-slate-600 text-xs mt-0.5">Start the conversation below.</p>
              </div>
            ) : (
              comments.map((comment) => {
                const isMe = comment.userId === user.id;

                return (
                  <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold text-slate-400">{comment.user.name}</span>
                      <span className="text-[9px] text-slate-600">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl max-w-sm text-sm ${
                      isMe
                        ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-950 text-slate-100 border border-slate-900 rounded-tl-none'
                    }`}>
                      {comment.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {}
          <form onSubmit={handleSendComment} className="flex gap-2 border-t border-slate-900 pt-4 shrink-0">
            <input
              type="text"
              required
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Post a comment..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 focus:border-emerald-500/50 outline-none text-sm text-slate-200 placeholder:text-slate-600 transition-all"
            />
            <button
              type="submit"
              className="px-4.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center shrink-0 hover:scale-[1.02]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}
