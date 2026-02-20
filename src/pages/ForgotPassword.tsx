import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock API call
    fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword: 'password123' }) // Reset to default for demo
    });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="text-slate-500 mt-2">Enter your email to reset your password</p>
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg mb-6">
              Check your email for instructions.
              <br/>
              <span className="text-xs text-slate-500">(For demo: password reset to 'password123')</span>
            </div>
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center justify-center gap-2">
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Send Reset Link
            </button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
