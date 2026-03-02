import React, { useEffect, useState } from 'react';
import { db, increment } from '../lib/firebase';
import { ShieldCheck, UserCheck, Ban, Plus, Check } from 'lucide-react';

interface User {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  status?: string;
  tokens?: number;
}

const WHITELIST = ['teacher@test.com', 'admin@braidstudio.com'];

export const AdminUserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsubscribe = db.collection('users').onSnapshot((snapshot) => {
      const userList = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as User[];
      setUsers(userList);
    }, (error) => {
      console.error("Error fetching users:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleApproveAccess = async (userId: string) => {
    try {
      await db.collection('users').doc(userId).update({
        status: 'active',
        tokens: 0
      });
    } catch (error) {
      console.error("Error approving user:", error);
      alert("Failed to approve user.");
    }
  };

  const handleAddTokens = async (userId: string, currentTokens: number = 0) => {
    const incrementAmount = 10000;
    const limitVal = 50000;

    if ((currentTokens || 0) + incrementAmount > limitVal) {
      alert(`Limit reached (${limitVal/1000}k). Cannot add more tokens.`);
      return;
    }

    try {
      await db.collection('users').doc(userId).update({
        tokens: increment(incrementAmount)
      });
    } catch (error) {
      console.error("Error adding tokens:", error);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string = 'active') => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    try {
      await db.collection('users').doc(userId).update({ status: newStatus });
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aWhite = a.email ? WHITELIST.includes(a.email) : false;
    const bWhite = b.email ? WHITELIST.includes(b.email) : false;
    if (aWhite && !bWhite) return -1;
    if (!aWhite && bWhite) return 1;
    return 0;
  });

  return (
    <div className="w-full overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Status</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Token Usage</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Management</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedUsers.map((user) => {
              const isWhitelisted = user.email && WHITELIST.includes(user.email);
              const isPending = user.status === 'pending';
              const isBanned = user.status === 'banned';

              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-900 uppercase tracking-tight">
                        {user.displayName || user.name || user.email?.split('@')[0] || 'Unknown User'}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isWhitelisted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-gray-100 text-gray-500 uppercase tracking-widest border border-gray-200">
                        <ShieldCheck size={12} /> WHITELISTED
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        isBanned ? 'bg-red-50 text-red-600 border-red-100' : isPending ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isBanned ? 'bg-red-500' : isPending ? 'bg-amber-500' : 'bg-green-500'}`} />
                        {user.status || 'Active'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-gray-700 font-mono">{user.tokens?.toLocaleString() || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isWhitelisted ? (
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">Unlimited Access</span>
                      ) : isPending ? (
                        <button onClick={() => handleApproveAccess(user.id)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-500/20 active:scale-95"><Check size={12} strokeWidth={3} /> Approve</button>
                      ) : (
                        <>
                          <button onClick={() => handleAddTokens(user.id, user.tokens)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95"><Plus size={10} strokeWidth={3} /> 10k Tokens</button>
                          <button onClick={() => handleToggleStatus(user.id, user.status)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border active:scale-95 ${isBanned ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-white text-red-500 border-red-100'}`}>
                            {isBanned ? <UserCheck size={12} /> : <Ban size={12} />} {isBanned ? 'Unban' : 'Ban'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
