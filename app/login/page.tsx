'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { logoBase64 } from '@/lib/logo';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const email = e.target.email.value;
    const password = e.target.password.value;

    // NextAuth handles the server validation
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      // ✅ FIX: Use window.location.href instead of router.push
      // This forces a hard reload, ensuring the Middleware sees the new Auth Cookie immediately.
      window.location.href = '/'; 
    }
  }

  return (
    // 'fixed inset-0' ensures this covers the sidebar/layout completely
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
        
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center p-2 bg-primary-50 rounded-full">
            {/* Display Logo if available, else fallback icon */}
            {logoBase64 ? (
                <img 
                  src={logoBase64} 
                  alt="Hughes Farms" 
                  className="w-full h-full object-contain" 
                />
            ) : (
                <div className="text-4xl">🚜</div>
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">Hughes Farms</h1>
          <p className="text-gray-500 text-sm">Sign in to manage your farm</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6 text-center font-medium border border-red-100 flex items-center justify-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input 
                name="email" 
                type="email" 
                required 
                placeholder="admin@farm.com" 
                className="w-full border border-gray-200 pl-10 p-3 rounded-lg outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input 
                name="password" 
                type="password" 
                required 
                placeholder="••••••••" 
                className="w-full border border-gray-200 pl-10 p-3 rounded-lg outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" 
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center shadow-md hover:shadow-lg"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign In"}
          </button>
        </form>
        
        <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} Hughes Farms Dashboard</p>
        </div>
      </div>
    </div>
  );
}
