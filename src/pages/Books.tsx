import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Book } from '../types';
import { Search, Plus, Upload, Download, FileText, Trash2 } from 'lucide-react';

export default function Books() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    prefix: 'D',
    start: 1,
    end: 10,
    title: '',
    author: '',
    category: ''
  });

  const fetchBooks = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    fetch(`/api/books?${params}`)
      .then(res => res.json())
      .then(data => setBooks(data.books));
  };

  useEffect(() => {
    fetchBooks();
  }, [search]);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/books/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkForm)
      });
      if (res.ok) {
        setShowBulkModal(false);
        fetchBooks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      await fetch('/api/import/books', {
        method: 'POST',
        body: formData
      });
      fetchBooks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = () => {
    window.location.href = '/api/export/books';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Book Inventory</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={18} />
            Bulk Add
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <Upload size={18} />
            Import CSV
            <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
          </label>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by title or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
        />
      </div>

      {/* Books List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-900 font-medium">
            <tr>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Author</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {books.map((book) => (
              <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-slate-500">{book.unique_code}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{book.title}</td>
                <td className="px-6 py-4">{book.author || '-'}</td>
                <td className="px-6 py-4">{book.category || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${book.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 
                      book.status === 'borrowed' ? 'bg-amber-100 text-amber-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {book.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
            <h2 className="text-xl font-bold mb-6">Bulk Add Books</h2>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prefix</label>
                  <input
                    type="text"
                    value={bulkForm.prefix}
                    onChange={e => setBulkForm({...bulkForm, prefix: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="D"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start #</label>
                  <input
                    type="number"
                    value={bulkForm.start}
                    onChange={e => setBulkForm({...bulkForm, start: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End #</label>
                  <input
                    type="number"
                    value={bulkForm.end}
                    onChange={e => setBulkForm({...bulkForm, end: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={bulkForm.title}
                  onChange={e => setBulkForm({...bulkForm, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Author</label>
                <input
                  type="text"
                  value={bulkForm.author}
                  onChange={e => setBulkForm({...bulkForm, author: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <input
                  type="text"
                  value={bulkForm.category}
                  onChange={e => setBulkForm({...bulkForm, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Generate Books
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
