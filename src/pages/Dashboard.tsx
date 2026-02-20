import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Book } from '../types';
import { BookOpen, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState({ total: 0, borrowed: 0, overdue: 0 });

  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => {
        setBooks(data.books);
        
        // Calculate stats
        const total = data.books.length;
        const borrowed = data.books.filter((b: Book) => b.status === 'borrowed').length;
        const overdue = data.books.filter((b: Book) => {
          if (b.status !== 'borrowed' || !b.due_date) return false;
          return new Date(b.due_date) < new Date();
        }).length;
        
        setStats({ total, borrowed, overdue });
      });
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">
          {user?.role === 'admin' ? 'Library Overview' : 'My Books'}
        </h1>
        <p className="text-slate-500 mt-2">
          Welcome back, {user?.name} ({user?.campus})
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Books</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Borrowed</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.borrowed}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Overdue</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.overdue}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            {user?.role === 'admin' ? 'Recent Activity' : 'Borrowed Books'}
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-medium">
              <tr>
                <th className="px-6 py-4">Book Code</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Status</th>
                {user?.role === 'admin' && <th className="px-6 py-4">Borrower</th>}
                <th className="px-6 py-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {books.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No books found.
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500">{book.unique_code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{book.title}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${book.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 
                          book.status === 'borrowed' ? 'bg-amber-100 text-amber-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {book.status}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4">{book.borrower_name || '-'}</td>
                    )}
                    <td className="px-6 py-4">
                      {book.due_date ? (
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          {format(new Date(book.due_date), 'MMM d, yyyy')}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
