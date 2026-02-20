import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Search, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function Circulation() {
  const [mode, setMode] = useState<'issue' | 'return'>('issue');
  const [bookCode, setBookCode] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (userSearch.length > 2) {
      fetch(`/api/users?search=${userSearch}`)
        .then(res => res.json())
        .then(data => setUsers(data.users || []));
    }
  }, [userSearch]);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setMessage({ type: 'error', text: 'Please select a user first' });
      return;
    }

    try {
      const res = await fetch('/api/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unique_code: bookCode, user_id: selectedUser.id })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `Book ${bookCode} issued to ${selectedUser.name}` });
        setBookCode('');
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to issue book' });
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unique_code: bookCode })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `Book ${bookCode} returned successfully` });
        setBookCode('');
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to return book' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Circulation Desk</h1>

      {/* Mode Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
        <button
          onClick={() => setMode('issue')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'issue' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Issue Book
        </button>
        <button
          onClick={() => setMode('return')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'return' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Return Book
        </button>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Issue Form */}
      {mode === 'issue' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Borrower</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search staff by name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              {users.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-2 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setUsers([]);
                        setUserSearch(u.name);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
                      <p className="font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email} • {u.grade || 'Admin'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedUser && (
              <div className="mt-2 text-sm text-emerald-600 font-medium">
                Selected: {selectedUser.name} ({selectedUser.campus})
              </div>
            )}
          </div>

          <form onSubmit={handleIssue}>
            <label className="block text-sm font-medium text-slate-700 mb-2">Book Unique Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={bookCode}
                onChange={(e) => setBookCode(e.target.value)}
                placeholder="Scan or type code (e.g. D0001)"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-medium transition-colors"
              >
                Issue
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Return Form */}
      {mode === 'return' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <form onSubmit={handleReturn}>
            <label className="block text-sm font-medium text-slate-700 mb-2">Book Unique Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={bookCode}
                onChange={(e) => setBookCode(e.target.value)}
                placeholder="Scan or type code (e.g. D0001)"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-medium transition-colors"
              >
                Return
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
