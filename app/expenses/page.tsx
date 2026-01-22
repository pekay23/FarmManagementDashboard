'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { 
  TrendingDown, Plus, Calendar, DollarSign, Tag, X, Wallet, Receipt
} from 'lucide-react';

export default function ExpensesPage() {
  const expenses = useLiveQuery(() => db.expenses.toArray().then(rows => rows.reverse())) || [];
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats
  const totalExpense = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const thisMonth = expenses
    .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  async function handleSubmit(e: any) {
    e.preventDefault();
    const formData = {
        title: e.target.title.value,
        amount: Number(e.target.amount.value),
        category: e.target.category.value,
        date: e.target.date.value,
        notes: e.target.notes.value,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
        updatedAt: new Date().toISOString()
    };

    try {
        // GENERATE UUID HERE
        await db.expenses.add({
            id: crypto.randomUUID(), 
            ...formData
        } as any);
        toast.success("Expense recorded");
        setIsModalOpen(false);
    } catch (err) {
        toast.error("Failed to save expense");
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500">Track farm costs and spending</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors">
            <Plus className="w-5 h-5" /> Add Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-50 text-red-600"><TrendingDown className="w-6 h-6" /></div>
            <div><p className="text-sm text-gray-500 font-medium">Total Expenses</p><h3 className="text-2xl font-bold text-gray-900">GH₵ {totalExpense.toLocaleString()}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600"><Calendar className="w-6 h-6" /></div>
            <div><p className="text-sm text-gray-500 font-medium">This Month</p><h3 className="text-2xl font-bold text-gray-900">GH₵ {thisMonth.toLocaleString()}</h3></div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-medium text-gray-700 bg-gray-50/50">Recent Transactions</div>
        <div className="divide-y divide-gray-50">
            {expenses.length === 0 && <div className="p-8 text-center text-gray-400">No expenses recorded yet.</div>}
            {expenses.map((exp: any) => (
                <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-full text-gray-500"><Receipt className="w-5 h-5" /></div>
                        <div>
                            <p className="font-bold text-gray-800">{exp.title}</p>
                            <div className="flex gap-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(exp.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><Tag className="w-3 h-3"/> {exp.category}</span>
                            </div>
                        </div>
                    </div>
                    <span className="font-bold text-red-600">- GH₵ {exp.amount.toFixed(2)}</span>
                </div>
            ))}
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Record Expense</h2>
                    <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                        <input name="title" required placeholder="e.g. Tractor Fuel" className="w-full border p-3 rounded-lg outline-none focus:border-red-500 mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Amount (GH₵)</label>
                            <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full border p-3 rounded-lg outline-none focus:border-red-500 mt-1" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                            <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none focus:border-red-500 mt-1" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                        <select name="category" className="w-full border p-3 rounded-lg bg-white outline-none focus:border-red-500 mt-1">
                            <option>Seeds</option>
                            <option>Fertilizer</option>
                            <option>Labor</option>
                            <option>Fuel</option>
                            <option>Maintenance</option>
                            <option>Feed</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Notes (Optional)</label>
                        <textarea name="notes" rows={2} className="w-full border p-3 rounded-lg resize-none outline-none focus:border-red-500 mt-1" />
                    </div>
                    <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold">Save Expense</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
