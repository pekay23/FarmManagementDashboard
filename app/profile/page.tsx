'use client';

import { useState } from 'react';
import { Lock, Save, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function Profile() {
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  async function handleUpdate(e: any) {
    e.preventDefault();
    if (pass.length < 6) {
        setMsg({ type: 'error', text: 'Password must be at least 6 characters' });
        return;
    }

    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword: pass })
        });

        if (res.ok) {
            setMsg({ type: 'success', text: 'Password updated successfully!' });
            setPass('');
        } else {
            const data = await res.json();
            setMsg({ type: 'error', text: data.error || 'Failed to update' });
        }
    } catch (err) {
        setMsg({ type: 'error', text: 'Network error occurred' });
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">My Profile</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary-600"/> Security Settings
        </h3>

        {msg.text && (
            <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 text-sm font-medium ${
                msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
                {msg.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>} 
                {msg.text}
            </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
            <div>
                <label className="text-xs text-gray-500 font-bold uppercase ml-1">New Password</label>
                <input 
                    type="password" 
                    required 
                    placeholder="••••••••" 
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all mt-1"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                />
            </div>

            <button 
                disabled={loading || !pass} 
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-sm"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                Update Password
            </button>
        </form>
      </div>
    </div>
  );
}
