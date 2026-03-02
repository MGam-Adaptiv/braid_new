
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { cancelDeletionRequest } from '../services/adminService';
import { ShieldAlert, LogOut, CheckCircle, RefreshCw, Clock } from 'lucide-react';

export const RestoreAccountPage: React.FC = () => {
  const { user, userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [isRestoring, setIsRestoring] = useState(false);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (userData && userData.status !== 'pending_deletion') {
      navigate('/');
    }

    if (userData?.deletionRequestedAt) {
      const requestedAt = userData.deletionRequestedAt.toMillis ? userData.deletionRequestedAt.toMillis() : new Date(userData.deletionRequestedAt).getTime();
      const expiryDate = requestedAt + (30 * 24 * 60 * 60 * 1000);
      const diff = expiryDate - Date.now();
      const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      setRemainingDays(days);
    }
  }, [user, userData, navigate]);

  const handleRestore = async () => {
    if (!user) return;
    setIsRestoring(true);
    try {
      await cancelDeletionRequest(user.uid);
      // Auth context listener will update and root redirect will handle dashboard navigation
      navigate('/');
    } catch (err) {
      console.error("Failed to restore account:", err);
      alert("Restoration failed. Please try again or contact support.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-coral animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="h-2 bg-red-500" />
        
        <div className="p-10 text-center">
          <div className="mb-8 flex justify-center opacity-80 grayscale">
            <Logo size="sm" layout="vertical" />
          </div>

          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
            <ShieldAlert size={40} />
          </div>
          
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">
            Account Scheduled for Deletion
          </h2>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-red-100">
            <Clock size={14} className="animate-pulse" />
            {remainingDays !== null ? `${remainingDays} Days Remaining` : 'Calculating...'}
          </div>

          <p className="text-sm font-medium text-gray-500 leading-relaxed mb-10 px-4">
            Your account and all associated data are in a 30-day grace period. After this, your materials and activities will be permanently removed.
          </p>

          <div className="space-y-3">
            <button 
              onClick={handleRestore}
              disabled={isRestoring}
              className="w-full py-5 bg-success text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-success/20 hover:bg-[#0EA271] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              {isRestoring ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle size={20} />}
              {isRestoring ? 'RESTORING...' : 'Cancel Deletion & Restore Account'}
            </button>

            <button 
              onClick={handleSignOut}
              className="w-full py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      <p className="mt-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] opacity-40">
        Braid Studio — Deletion Grace Period
      </p>
    </div>
  );
};
