'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Trash2, Pencil, Shield, 
  Lock, Mail, X, Loader2, Warehouse 
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.is_superadmin;

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: any) {
    e.preventDefault();
    const formData = {
        email: e.target.email.value,
        password: e.target.password.value,
        farm_name: e.target.farm_name?.value, // ✅ Capture Farm Name for new users
    };

    try {
        let res;
        if (editingUser) {
            // Update existing
            res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingUser.id, ...formData })
            });
        } else {
            // Create new
            res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        }

        if (res.ok) {
            toast.success(editingUser ? "Account updated" : "New Farm Owner & Farm created!");
            setIsModalOpen(false);
            setEditingUser(null);
            fetchUsers(); 
        } else {
            const err = await res.json();
            toast.error(err.error || "Operation failed");
        }
    } catch (error) {
        toast.error("Network error");
    }
  }

  async function handleDelete(id: number) {
      if (!confirm("Delete this user? This cannot be undone.")) return;
      try {
          const res = await fetch('/api/users', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id })
          });
          if (res.ok) {
              toast.success("User deleted");
              fetchUsers();
          } else {
              toast.error("Failed to delete user");
          }
      } catch (e) {
          toast.error("Error deleting user");
      }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600"/> 
            {isSuperAdmin ? "Platform User Management" : "Account Management"}
          </h1>
          <p className="text-gray-500">Manage farm owner accounts</p>
        </div>
        
        {/* Only Super Admin can add new Farm Owners directly here */}
        {isSuperAdmin && (
            <button 
                onClick={() => { setEditingUser(null); setIsModalOpen(true); }} 
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-md transition-colors"
            >
                <UserPlus className="w-5 h-5" /> Add Farm Owner
            </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
            <div className="p-12 flex justify-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                            <th className="p-4 font-semibold">User / Email</th>
                            {isSuperAdmin && <th className="p-4 font-semibold">Farm Name</th>}
                            <th className="p-4 font-semibold">Type</th>
                            <th className="p-4 font-semibold">Joined</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold">
                                            {user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="font-medium text-gray-900">{user.email}</div>
                                    </div>
                                </td>
                                
                                {isSuperAdmin && (
                                    <td className="p-4 text-sm text-gray-600 font-medium">
                                        {user.farm_name || <span className="text-gray-400 italic">No Farm</span>}
                                    </td>
                                )}

                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                        (user.role === 'Admin' || user.is_superadmin) ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                        {(user.role === 'Admin' || user.is_superadmin) ? 'Platform Admin' : 'Farm Owner'}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button 
                                        onClick={() => { setEditingUser(user); setIsModalOpen(true); }} 
                                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(user.id)} 
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{editingUser ? 'Edit Account' : 'Create Farm Owner'}</h2>
                    <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
                        <div className="relative mt-1">
                            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            <input 
                                name="email" 
                                type="email" 
                                required 
                                defaultValue={editingUser?.email}
                                disabled={!!editingUser} 
                                className="w-full pl-9 pr-4 py-2.5 border rounded-lg outline-none focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500" 
                                placeholder="client@farm.com"
                            />
                        </div>
                    </div>

                    {/* ✅ New Field: Farm Name (Only for new users) */}
                    {!editingUser && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Farm Name</label>
                            <div className="relative mt-1">
                                <Warehouse className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                <input 
                                    name="farm_name" 
                                    type="text" 
                                    required 
                                    className="w-full pl-9 pr-4 py-2.5 border rounded-lg outline-none focus:border-primary-500" 
                                    placeholder="e.g. Sunrise Organics"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                            {editingUser ? 'New Password (Optional)' : 'Password'}
                        </label>
                        <div className="relative mt-1">
                            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            <input 
                                name="password" 
                                type="password" 
                                required={!editingUser} 
                                className="w-full pl-9 pr-4 py-2.5 border rounded-lg outline-none focus:border-primary-500" 
                                placeholder="••••••••"
                            />
                        </div>
                        {editingUser && <p className="text-xs text-gray-400 mt-1 ml-1">Leave blank to keep current password.</p>}
                    </div>

                    <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold shadow-md mt-2">
                        {editingUser ? 'Update Account' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
