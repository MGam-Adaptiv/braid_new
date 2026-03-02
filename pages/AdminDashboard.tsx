import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllUsers, approveUserAccess } from '../services/userService';
import UserDetailPanel from './admin/UserDetailPanel';
import { 
  Users, Activity, AlertTriangle, CheckCircle, RefreshCw, 
  LayoutGrid, Shield, UserPlus, Infinity as InfinityIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'intelligence' | 'governance' | 'approvals'>('intelligence');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, totalTokens: 0 });

  // VIP Logic
  const VIP_EMAILS = ['teacher@test.com', 'admin@braidstudio.com'];
  const isUnlimited = (user: any) => VIP_EMAILS.includes(user.email) || user.isWhitelisted;

  const fetchData = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      
      const totalTokens = allUsers.reduce((acc, user) => acc + (user.totalTokensUsed || 0), 0);
      setStats({
        total: allUsers.length,
        active: allUsers.filter(u => u.status === 'approved').length,
        pending: allUsers.filter(u => u.status === 'pending').length,
        totalTokens
      });
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const pendingUsers = users.filter(u => u.status === 'pending');

  const handleApprove = async (uid: string) => {
    await approveUserAccess(uid);
    toast.success("User Approved");
    fetchData();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen bg-gray-50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">ADMIN HUB <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded ml-2">(v2.0)</span></h1>
          <p className="text-gray-500 text-sm font-medium">PLATFORM INTELLIGENCE & OPERATIONS</p>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
          <button 
            onClick={() => setActiveTab('intelligence')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'intelligence' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> INTELLIGENCE
          </button>
          
          <button 
            onClick={() => setActiveTab('governance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'governance' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-4 h-4" /> GOVERNANCE
          </button>

          <button 
            onClick={() => setActiveTab('approvals')}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'approvals' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <UserPlus className="w-4 h-4" /> APPROVALS
            {stats.pending > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-pulse">
                {stats.pending}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-2">
           <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
           </button>
           <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-xs font-bold uppercase tracking-wider transition-colors">
              MY PROFILE
           </button>
        </div>
      </div>

      {/* --- TAB CONTENT START --- */}

      {/* 1. INTELLIGENCE TAB (Stats Only) */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard icon={<Users className="w-6 h-6 text-blue-600" />} label="TOTAL USERS" value={stats.total} />
            <StatsCard icon={<CheckCircle className="w-6 h-6 text-green-600" />} label="ACTIVE USERS" value={stats.active} />
            <StatsCard icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} label="PENDING REVIEW" value={stats.pending} />
            <StatsCard icon={<Activity className="w-6 h-6 text-purple-600" />} label="CREDITS CONSUMED" value={stats.totalTokens.toLocaleString()} />
          </div>
          
          <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Live Telemetry</h3>
            <p className="text-sm">Real-time usage charts and cost analysis coming soon.</p>
          </div>
        </div>
      )}

      {/* 2. GOVERNANCE TAB (User Table) */}
      {activeTab === 'governance' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-500">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" /> User Database
            </h2>
            <span className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold">
              {users.length} Records
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Identity</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Credit Usage</th>
                  <th className="px-6 py-4">Member Since</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const unlimited = isUnlimited(user);
                  return (
                    <tr 
                      key={user.uid} 
                      onClick={() => setSelectedUser(user)} 
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ backgroundColor: user.avatarColor || '#EF3D5A' }}>
                            {user.displayName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              {user.displayName}
                              {unlimited && <span className="text-[10px] bg-yellow-400 text-white px-1.5 py-0.5 rounded font-bold shadow-sm">VIP</span>}
                            </div>
                            <div className="text-gray-400 text-xs font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wide border border-gray-200">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600">
                        {unlimited ? (
                          <div className="flex items-center gap-1 text-green-600 bg-green-50 w-fit px-2 py-1 rounded border border-green-100">
                            <InfinityIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase">Unlimited</span>
                          </div>
                        ) : (
                          <div className="w-32">
                            <div className="flex justify-between text-[10px] mb-1 font-bold uppercase text-gray-400">
                              <span>{user.totalTokensUsed?.toLocaleString() || 0}</span>
                              <span>{(50000 + (user.bonusTokens || 0)).toLocaleString()} Limit</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${user.totalTokensUsed > (50000 + (user.bonusTokens || 0)) * 0.8 ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(((user.totalTokensUsed || 0) / (50000 + (user.bonusTokens || 0))) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs font-medium">
                        {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className="text-gray-300 group-hover:text-blue-600 transition-colors text-[10px] font-bold uppercase tracking-wider">Manage →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. APPROVALS TAB (Pending Users) */}
      {activeTab === 'approvals' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            {pendingUsers.length === 0 ? (
              <div className="py-12">
                <CheckCircle className="w-16 h-16 text-green-100 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
                <p className="text-gray-500">There are no users waiting for approval.</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-lg font-bold text-gray-900 text-left mb-4">Pending Requests ({pendingUsers.length})</h3>
                {pendingUsers.map(user => (
                   <div key={user.uid} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-yellow-50/50 hover:bg-yellow-50 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                          {user.displayName?.[0]}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-gray-900">{user.displayName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApprove(user.uid)}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition shadow-sm"
                        >
                          Approve Access
                        </button>
                      </div>
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SLIDE-OVER PANEL */}
      {selectedUser && (
        <UserDetailPanel 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onUpdate={fetchData} 
        />
      )}
    </div>
  );
}

// Stats Card Component
const StatsCard = ({ icon, label, value }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4 hover:shadow-md transition-all duration-300">
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">{icon}</div>
    <div>
      <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</div>
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    approved: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    banned: 'bg-gray-900 text-white border-gray-900'
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${styles[status] || styles.pending} uppercase shadow-sm`}>
      {status}
    </span>
  );
};
