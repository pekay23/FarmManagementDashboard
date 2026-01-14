'use client';
import { useState } from 'react';
import { Lock, Save, CheckCircle } from 'lucide-react';

export default function Profile() {
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');

  async function handleUpdate(e: any) {
    e.preventDefault();
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: pass })
    });
    if (res.ok) {
        setMsg('Password updated successfully!');
        setPass('');
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4"/> Change Password
        </h3>
        {msg && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 flex gap-2"><CheckCircle className="w-5 h-5"/> {msg}</div>}
        <form onSubmit={handleUpdate} className="space-y-4">
            <input 
                type="password" 
                required 
                placeholder="New Password" 
                className="w-full border p-3 rounded-lg outline-none focus:border-green-500"
                value={pass}
                onChange={e => setPass(e.target.value)}
            />
            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold flex justify-center gap-2">
                <Save className="w-4 h-4" /> Update Password
            </button>
        </form>
      </div>
    </div>
  );
}
