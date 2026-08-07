import React, { useState, useEffect } from 'react';
import { X, Shield, RefreshCw, Ban, Star, Gift, CheckCircle, Trash2, Pencil, ScanLine, FileText, Zap, Repeat, BookOpen, Lightbulb, ChevronDown } from 'lucide-react';
import { db, increment, auth } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface UserDetailPanelProps {
  user: any;
  onClose: () => void;
  onUpdate: () => void;
}

const OP_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  'ocr':         { label: 'Material Scan',     icon: <ScanLine className="w-3 h-3" /> },
  'extraction':  { label: 'Page Extract',      icon: <FileText className="w-3 h-3" /> },
  'drafting':    { label: 'Draft Partner',     icon: <BookOpen className="w-3 h-3" /> },
  'enhance':     { label: 'Enhance',           icon: <Zap className="w-3 h-3" /> },
  'conversion':  { label: 'Convert Activity',  icon: <Repeat className="w-3 h-3" /> },
  'action-plan': { label: 'Action Plan',       icon: <Lightbulb className="w-3 h-3" /> },
};

export default function UserDetailPanel({ user, onClose, onUpdate }: UserDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [giftAmount, setGiftAmount] = useState(5000);
  const [budgetBonus, setBudgetBonus] = useState(0.50);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingLimit, setEditingLimit] = useState(false);
  const [newCostLimit, setNewCostLimit] = useState<number>(user.monthlyCostLimit || 0.50);
  const [editingTokenLimit, setEditingTokenLimit] = useState(false);
  const [newTokenLimit, setNewTokenLimit] = useState<number>(user.tokenLimit || 50000);
  const [usageBreakdown, setUsageBreakdown] = useState<Record<string, { tokens: number; cost: number }>>({});

  // VIP Logic
  const VIP_EMAILS = ['teacher@test.com', 'admin@braidstudio.com'];
  const isUnlimited = user.isWhitelisted || VIP_EMAILS.includes(user.email);

  // Token metrics
  const currentTokenLimit = (user.tokenLimit || 50000) + (user.bonusTokens || 0);
  const tokensUsed = user.totalTokensUsed || 0;
  const tokenPercent = Math.min((tokensUsed / currentTokenLimit) * 100, 100);

  // Cost metrics
  const costUsed = user.totalCostUsed || 0;
  const costLimit = user.monthlyCostLimit || 0;
  const costPercent = costLimit > 0 ? Math.min((costUsed / costLimit) * 100, 100) : 0;

  // Load per-operation breakdown for current month
  useEffect(() => {
    const month = new Date().toISOString().substring(0, 7);
    db.collection('tokenUsage')
      .where('userId', '==', user.uid)
      .where('month', '==', month)
      .get()
      .then(snap => {
        const breakdown: Record<string, { tokens: number; cost: number }> = {};
        snap.forEach(doc => {
          const d = doc.data();
          const op = d.operation as string;
          if (!breakdown[op]) breakdown[op] = { tokens: 0, cost: 0 };
          breakdown[op].tokens += d.totalTokens || 0;
          breakdown[op].cost   += d.costEUR    || 0;
        });
        setUsageBreakdown(breakdown);
      })
      .catch(() => {}); // non-blocking
  }, [user.uid]);

  const handleAction = async (action: () => Promise<void>, successMsg: string) => {
    setLoading(true);
    try {
      await action();
      toast.success(successMsg);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const sendGift = () => handleAction(async () => {
    await db.collection('users').doc(user.uid).update({
      bonusTokens: increment(giftAmount)
    });
  }, `Gifted ${giftAmount.toLocaleString()} tokens!`);

  const addBudget = () => handleAction(async () => {
    const current = user.monthlyCostLimit || 0;
    await db.collection('users').doc(user.uid).update({
      monthlyCostLimit: Math.round((current + budgetBonus) * 10000) / 10000
    });
  }, `Added €${budgetBonus.toFixed(2)} to budget!`);

  const saveCostLimit = () => handleAction(async () => {
    await db.collection('users').doc(user.uid).update({ monthlyCostLimit: newCostLimit });
    setEditingLimit(false);
  }, `Cost limit set to €${newCostLimit.toFixed(2)}`);

  const saveTokenLimit = () => handleAction(async () => {
    await db.collection('users').doc(user.uid).update({ tokenLimit: newTokenLimit });
    setEditingTokenLimit(false);
  }, `Token limit set to ${newTokenLimit.toLocaleString()}`);

  const toggleWhitelist = () => handleAction(async () => {
    await db.collection('users').doc(user.uid).update({
      isWhitelisted: !user.isWhitelisted
    });
  }, user.isWhitelisted ? 'Removed from Whitelist' : 'Added to Whitelist');

  const updateStatus = (status: string) => handleAction(async () => {
    await db.collection('users').doc(user.uid).update({ status });
  }, `User status: ${status}`);

  const resetUsage = () => handleAction(async () => {
    if (!confirm('Reset ALL monthly usage (tokens + cost) for this user?')) return;
    await db.collection('users').doc(user.uid).update({
      totalTokensUsed: 0,
      totalCostUsed: 0,
    });
    setUsageBreakdown({});
  }, 'Usage reset to 0');

  const deleteUser = async () => {
    setLoading(true);
    try {
      const deleteToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/.netlify/functions/admin-delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(deleteToken ? { 'Authorization': `Bearer ${deleteToken}` } : {}) },
        body: JSON.stringify({ uid: user.uid, action: 'delete' }),
      });
      if (!res.ok) {
        const data = await res.json();
        const isAlreadyGone = data.error?.includes('user-not-found') || data.error?.includes('no user record');
        if (!isAlreadyGone) throw new Error('Auth deletion failed');
        // Auth user was already gone — still clean up Firestore document
        await db.collection('users').doc(user.uid).delete();
      }
      toast.success('User permanently deleted');
      onClose();
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Delete failed');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const totalBreakdownCost = Object.values(usageBreakdown).reduce((s, v) => s + v.cost, 0);

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl p-6 transform transition-transform border-l border-gray-100 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
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
            user.status === 'banned'   ? 'bg-red-100 text-red-700'   : 'bg-gray-100 text-gray-600'
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

      <div className="space-y-6">

        {/* SECTION 1: USAGE MONITOR */}
        <section className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Usage Monitor
          </h3>

          {isUnlimited ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">∞</div>
              <p className="text-sm font-bold text-green-600">Unlimited Access Active</p>
              <p className="text-xs text-gray-400">Usage tracking is disabled for VIPs</p>
            </div>
          ) : (
            <>
              {/* Token bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-medium mb-1 items-center">
                  <span className="text-gray-500">Tokens</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-700">{tokensUsed.toLocaleString()} / {currentTokenLimit.toLocaleString()}</span>
                    <button onClick={() => setEditingTokenLimit(true)} className="p-0.5 hover:bg-gray-200 rounded transition">
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${tokenPercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                       style={{ width: `${tokenPercent}%` }} />
                </div>
                {editingTokenLimit && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input
                      type="number"
                      step="10000"
                      min="0"
                      value={newTokenLimit}
                      onChange={e => setNewTokenLimit(parseInt(e.target.value) || 0)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={saveTokenLimit} disabled={loading}
                            className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition">
                      Save
                    </button>
                    <button onClick={() => setEditingTokenLimit(false)}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition">
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Cost bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-medium mb-1 items-center">
                  <span className="text-gray-500">Cost (€)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-700">
                      €{costUsed.toFixed(4)} / {costLimit > 0 ? `€${costLimit.toFixed(2)}` : 'No limit'}
                    </span>
                    <button onClick={() => setEditingLimit(true)} className="p-0.5 hover:bg-gray-200 rounded transition">
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                {costLimit > 0 && (
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${costPercent > 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                         style={{ width: `${costPercent}%` }} />
                  </div>
                )}
                {editingLimit && (
                  <div className="mt-2 flex gap-2 items-center">
                    <span className="text-xs text-gray-500">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newCostLimit}
                      onChange={e => setNewCostLimit(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={saveCostLimit} disabled={loading}
                            className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition">
                      Save
                    </button>
                    <button onClick={() => setEditingLimit(false)}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition">
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Per-operation breakdown */}
              {Object.keys(usageBreakdown).length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">This Month — By Feature</p>
                  <div className="space-y-1">
                    {Object.entries(usageBreakdown)
                      .sort((a, b) => b[1].cost - a[1].cost)
                      .map(([op, data]) => {
                        const opInfo = OP_LABELS[op] || { label: op, icon: <RefreshCw className="w-3 h-3" /> };
                        const pct = totalBreakdownCost > 0 ? (data.cost / totalBreakdownCost) * 100 : 0;
                        return (
                          <div key={op} className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400 w-3">{opInfo.icon}</span>
                            <span className="text-gray-600 w-28 truncate">{opInfo.label}</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-gray-500 w-12 text-right">{data.tokens.toLocaleString()}</span>
                            <span className="text-emerald-600 w-14 text-right font-mono">€{data.cost.toFixed(4)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {Object.keys(usageBreakdown).length === 0 && (
                <p className="text-[11px] text-gray-400 italic mb-4">No usage this month yet.</p>
              )}

              <button onClick={resetUsage} disabled={loading}
                      className="w-full py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                Reset Monthly Usage to 0
              </button>
            </>
          )}
        </section>

        {/* SECTION 2: GIFT (Hidden for VIPs) */}
        {!isUnlimited && (
          <section className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Gift className="w-3 h-3" /> Gift Credits
            </h3>

            {/* Gift tokens */}
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wide">Tokens</p>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <select value={giftAmount} onChange={e => setGiftAmount(Number(e.target.value))}
                        className="w-full appearance-none px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={5000}>+ 5,000 Tokens</option>
                  <option value={10000}>+ 10,000 Tokens</option>
                  <option value={20000}>+ 20,000 Tokens</option>
                  <option value={50000}>+ 50,000 Tokens</option>
                  <option value={100000}>+ 100,000 Tokens</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <ChevronDown className="w-4 h-4" strokeWidth={2} />
                </div>
              </div>
              <button onClick={sendGift} disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
                Gift <CheckCircle className="w-3 h-3" />
              </button>
            </div>

            {/* Add budget */}
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wide">Budget (€)</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select value={budgetBonus} onChange={e => setBudgetBonus(Number(e.target.value))}
                        className="w-full appearance-none px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0.25}>+ €0.25</option>
                  <option value={0.50}>+ €0.50</option>
                  <option value={1.00}>+ €1.00</option>
                  <option value={2.00}>+ €2.00</option>
                  <option value={5.00}>+ €5.00</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <ChevronDown className="w-4 h-4" strokeWidth={2} />
                </div>
              </div>
              <button onClick={addBudget} disabled={loading}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 shadow-sm">
                Add <CheckCircle className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[10px] text-blue-400 mt-2 px-1">
              * Tokens add to the base token quota. Budget activates/extends the € cost gate.
            </p>
          </section>
        )}

        {/* SECTION 3: GOVERNANCE */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-3 h-3" /> Governance
          </h3>

          <div className="space-y-3">
            <button onClick={toggleWhitelist} disabled={loading}
                    className={`w-full py-3 flex items-center justify-between px-4 border rounded-xl transition group ${user.isWhitelisted ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200 hover:border-yellow-400'}`}>
              <span className={`text-sm font-medium ${user.isWhitelisted ? 'text-yellow-800' : 'text-gray-700'}`}>
                {user.isWhitelisted ? 'User is Whitelisted (VIP)' : 'Grant VIP Status'}
              </span>
              <Star className={`w-4 h-4 ${user.isWhitelisted ? 'text-yellow-500 fill-current' : 'text-gray-300 group-hover:text-yellow-400'}`} />
            </button>

            {user.status !== 'banned' ? (
              <button onClick={() => updateStatus('banned')} disabled={loading}
                      className="w-full py-3 flex items-center justify-center gap-2 bg-white border border-red-100 text-red-600 rounded-xl hover:bg-red-50 transition text-sm font-bold">
                <Ban className="w-4 h-4" /> Ban Access
              </button>
            ) : (
              <button onClick={() => updateStatus('approved')} disabled={loading}
                      className="w-full py-3 flex items-center justify-center gap-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition text-sm font-bold">
                <Shield className="w-4 h-4" /> Unban / Restore Access
              </button>
            )}

            {/* Delete User */}
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} disabled={loading}
                      className="w-full py-3 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition text-sm font-medium mt-2">
                <Trash2 className="w-4 h-4" /> Delete Account
              </button>
            ) : (
              <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm font-bold text-red-700 mb-1">Permanently delete this user?</p>
                <p className="text-xs text-red-500 mb-3">Removes them from Firebase Auth and the user database. Cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} disabled={loading}
                          className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button onClick={deleteUser} disabled={loading}
                          className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1">
                    <Trash2 className="w-3 h-3" /> {loading ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

