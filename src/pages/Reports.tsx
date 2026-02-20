import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText } from 'lucide-react';

export default function Reports() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/reports/unreturned')
      .then(res => res.json())
      .then(res => setData(res.report));
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-slate-900">Unreturned Books by Grade</h2>
          <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors">
            <FileText size={16} />
            Download PDF
          </button>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
