import React, { useState } from 'react';
import { X, Shield, Ban, UserCheck, Activity, Mail, Calendar, Key } from 'lucide-react';
import { approveUserAccess, updateUserUsage } from '../services/userService';
import { db, serverTimestamp } from '../lib/firebase';
import toast from 'react-hot-toast';

interface UserDetailPanelProps {
  user: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function UserDetailPanel({ user, onClose, onUpdate }: UserDetailPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleApprove = async () => {
    setIsUpdating(true);
    try {
      await approveUserAccess(user.uid);
      toast.success(`${user.displayName} approved!`);
      onUpdate();
      onClose();
    } catch (error) {
      toast.error("Approval failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleBan = async () => {
    setIsUpdating(true);
    const newStatus = user.status === 'banned' ? 'approved' : 'banned';
    try {
      await db.collection('users').doc(user.uid).update({
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(newStatus === 'banned' ? "User banned." : "User restored.");
      onUpdate();
      onClose();
    } catch (error) {
      toast.error("Status update failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetCredits = async () => {
    setIsUpdating(true);
    try {
      await updateUserUsage(user.uid, 0);
      toast.success("Credits reset successfully.");
      onUpdate();
    } catch (error) {
      toast.error("Reset failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg" style={{ backgroundColor: user.avatarColor || '#EF3D5A' }}>
               {user.displayName?.[0]?.toUpperCase()}
             </div>
             <div>
                <h3 className="font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{user.displayName}</h3>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-gray-200">UID: {user.uid.slice(0, 8)}</span>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-coral transition-colors bg-white rounded-xl border border-gray-200 shadow-sm"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          
          {/* Identity Block */}
          <section className="space-y-4">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Member Profile</h4>
             <div className="bg-gray-50 rounded-2xl p-5 space-y-4 border border-gray-100">
                <div className="flex items-center gap-3">
                   <Mail className="w-4 h-4 text-gray-300" />
                   <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                      <p className="text-xs font-bold text-gray-700 truncate">{user.email}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <Calendar className="w-4 h-4 text-gray-300" />
                   <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Joined On</p>
                      <p className="text-xs font-bold text-gray-700">{user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <Key className="w-4 h-4 text-gray-300" />
                   <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Global Permissions</p>
                      <p className="text-xs font-black text-coral uppercase tracking-tight">{user.role}</p>
                   </div>
                </div>
             </div>
          </section>

          {/* Usage Block */}
          <section className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Platform Credits</h4>
                <button 
                  onClick={handleResetCredits}
                  disabled={isUpdating}
                  className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest disabled:opacity-50"
                >
                  Reset to 0
                </button>
             </div>
             <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                <div className="text-4xl font-black text-gray-900 tracking-tighter mb-2">
                  {user.totalTokensUsed?.toLocaleString() || 0}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Credits Consumed</div>
                
                <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${user.totalTokensUsed > 40000 ? 'bg-coral' : 'bg-blue-500'}`} 
                    style={{ width: `${Math.min(((user.totalTokensUsed || 0) / 50000) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Quota: 50,000 Credits / Month</p>
             </div>
          </section>

          {/* Governance Block */}
          <section className="space-y-4">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Governance Operations</h4>
             <div className="grid grid-cols-1 gap-3">
                {user.status === 'pending' && (
                  <button 
                    onClick={handleApprove}
                    disabled={isUpdating}
                    className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <UserCheck size={16} /> Approve Account
                  </button>
                )}
                
                <button 
                  onClick={handleToggleBan}
                  disabled={isUpdating}
                  className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] border-2 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${
                    user.status === 'banned' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' 
                      : 'bg-white border-red-100 text-red-500 hover:bg-red-50'
                  }`}
                >
                  {user.status === 'banned' ? <UserCheck size={16} /> : <Ban size={16} />}
                  {user.status === 'banned' ? 'Restore Access' : 'Ban User'}
                </button>
             </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
            Actions performed here are <br/> permanent and audited.
          </p>
          <div className="flex gap-2">
            <Shield size={16} className="text-gray-300" />
            <Activity size={16} className="text-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
