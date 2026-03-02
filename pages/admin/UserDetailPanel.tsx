import React, { useState } from 'react';
import { X, Shield, RefreshCw, Ban, Star, Gift, CheckCircle } from 'lucide-react';
import { db, increment } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface UserDetailPanelProps {
  user: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function UserDetailPanel({ user, onClose, onUpdate }: UserDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [giftAmount, setGiftAmount] = useState(5000);

  // VIP Logic
  const VIP_EMAILS = ['teacher@test.com', 'admin@braidstudio.com'];
  const isUnlimited = user.isWhitelisted || VIP_EMAILS.includes(user.email);

  // Calculate dynamic limit
  const currentLimit = 50000 + (user.bonusTokens || 0);
  const usagePercent = Math.min(((user.totalTokensUsed || 0) / currentLimit) * 100, 100);

  const handleAction = async (action: () => Promise<void>, successMsg: string) => {
    setLoading(true);
    try {
      await action();
      toast.success(successMsg);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  };

  const sendGift = () => handleAction(async () => {
    await db.collection('users').doc(user.uid).update({ 
      bonusTokens: increment(giftAmount) 
    });
  }, `Gifted ${giftAmount.toLocaleString()} tokens!`);

  const toggleWhitelist = () => handleAction(async () => {
    await db.collection('users').doc(user.uid).update({ 
      isWhitelisted: !user.isWhitelisted 
    });
  }, user.isWhitelisted ? "Removed from Whitelist" : "Added to Whitelist");

  const updateStatus = (status: string) => handleAction(async () => {
    await db.collection('users').doc(user.uid).update({ status });
  }, `User status: ${status}`);

  const resetUsage = () => handleAction(async () => {
    if(!confirm("Reset ALL monthly token usage for this user?")) return;
    await db.collection('users').doc(user.uid).update({ totalTokensUsed: 0 });
  }, "Usage reset to 0");

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl p-6 transform transition-transform border-l border-gray-100 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex gap-2">
          {isUnlimited && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 fill-current" /> VIP
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${
            user.status === 'approved' ? 'bg-green-100 text-green-700' : 
            user.status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {user.status}
          </span>
        </div>
      </div>

      {/* Profile Info */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg ring-4 ring-gray-50" 
             style={{ backgroundColor: user.avatarColor || '#EF3D5A' }}>
          {user.displayName?.[0]?.toUpperCase()}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{user.displayName}</h2>
        <p className="text-gray-500 text-sm font-mono mb-2">{user.email}</p>
        <div className="inline-block px-2 py-1 bg-gray-100 rounded text-[10px] text-gray-400 font-mono select-all">
          {user.uid}
        </div>
      </div>

      <div className="space-y-8">
        
        {/* SECTION 1: USAGE METRICS */}
        <section className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Usage Metrics
          </h3>
          
          {isUnlimited ? (
             <div className="text-center py-4">
               <div className="text-3xl mb-2">∞</div>
               <p className="text-sm font-bold text-green-600">Unlimited Access Active</p>
               <p className="text-xs text-gray-400">Usage tracking is disabled for VIPs</p>
             </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-gray-900">{user.totalTokensUsed?.toLocaleString() || 0} used</span>
                  <span className="text-gray-500">of {currentLimit.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${usagePercent}%` }} />
                </div>
              </div>

              <button onClick={resetUsage} disabled={loading} className="w-full py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                Reset Monthly Usage to 0
              </button>
            </>
          )}
        </section>

        {/* SECTION 2: GIFT TOKENS (Hidden for VIPs) */}
        {!isUnlimited && (
          <section className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
             <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Gift className="w-3 h-3" /> Gift Platform Credits
            </h3>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select 
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(Number(e.target.value))}
                  className="w-full appearance-none px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5000}>+ 5,000 Tokens</option>
                  <option value={10000}>+ 10,000 Tokens</option>
                  <option value={20000}>+ 20,000 Tokens</option>
                  <option value={50000}>+ 50,000 Tokens</option>
                  <option value={100000}>+ 100,000 Tokens</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              
              <button 
                onClick={sendGift} 
                disabled={loading} 
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
              >
                Gift <CheckCircle className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[10px] text-blue-400 mt-2 px-1">
              * Increases the user's quota for this month only.
            </p>
          </section>
        )}

        {/* SECTION 3: ACCESS CONTROL */}
        <section>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-3 h-3" /> Governance
          </h3>
          
          <div className="space-y-3">
            <button onClick={toggleWhitelist} disabled={loading} className={`w-full py-3 flex items-center justify-between px-4 border rounded-xl transition group ${user.isWhitelisted ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200 hover:border-yellow-400'}`}>
              <span className={`text-sm font-medium ${user.isWhitelisted ? 'text-yellow-800' : 'text-gray-700'}`}>
                {user.isWhitelisted ? 'User is Whitelisted (VIP)' : 'Grant VIP Status'}
              </span>
              <Star className={`w-4 h-4 ${user.isWhitelisted ? 'text-yellow-500 fill-current' : 'text-gray-300 group-hover:text-yellow-400'}`} />
            </button>

            {user.status !== 'banned' ? (
              <button onClick={() => updateStatus('banned')} disabled={loading} className="w-full py-3 flex items-center justify-center gap-2 bg-white border border-red-100 text-red-600 rounded-xl hover:bg-red-50 transition text-sm font-bold">
                <Ban className="w-4 h-4" /> Ban Access
              </button>
            ) : (
              <button onClick={() => updateStatus('approved')} disabled={loading} className="w-full py-3 flex items-center justify-center gap-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition text-sm font-bold">
                <Shield className="w-4 h-4" /> Unban / Restore Access
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
