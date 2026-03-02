
import React from 'react';
import { 
  ShieldCheck, 
  AlertCircle,
  Activity,
  Check
} from 'lucide-react';
import { UserProfile } from '../services/userService';

interface PlatformPulseProps { 
  users: (UserProfile & { id: string })[]; 
  onUserClick: (user: UserProfile & { id: string }) => void; 
}

const WHITELIST = ['teacher@test.com', 'admin@braidstudio.com'];

export const PlatformPulse: React.FC<PlatformPulseProps> = ({ users, onUserClick }) => {

  // 1. Sort: Whitelisted first, then Pending (non-whitelisted), then others (newest first)
  const sortedUsers = [...users].sort((a, b) => { 
    const isAWhitelisted = WHITELIST.includes(a.email); 
    const isBWhitelisted = WHITELIST.includes(b.email); 
    
    // Priority 1: Whitelisted Users
    if (isAWhitelisted && !isBWhitelisted) return -1;
    if (!isAWhitelisted && isBWhitelisted) return 1;

    // Pending check must exclude whitelisted users to match visual logic
    const isAPending = !isAWhitelisted && a.status === 'pending'; 
    const isBPending = !isBWhitelisted && b.status === 'pending';

    // Priority 2: Pending Users (Non-Whitelisted)
    if (isAPending && !isBPending) return -1;
    if (!isAPending && isBPending) return 1;
    
    // Priority 3: Timestamp (Newest First) if available, else standard fallback
    // Safely handle timestamp objects
    const getTime = (val: any) => val?.toDate ? val.toDate().getTime() : new Date(val || 0).getTime();
    return getTime(b.createdAt) - getTime(a.createdAt);
  });

  // Calculate actual pending count for header dot (strictly non-whitelist)
  const pendingCount = users.filter(u => u.status === 'pending' && !WHITELIST.includes(u.email)).length;

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-black uppercase text-gray-900 tracking-widest flex items-center gap-2">
          <Activity size={14} className={pendingCount > 0 ? "text-orange-500" : "text-green-500"} /> 
          Platform Pulse
        </h3>
        {pendingCount > 0 && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
        )}
      </div>

      <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar flex-1">
        {sortedUsers.map((user, index) => {
          // LOGIC: Whitelist Overrides Everything
          const isWhitelisted = WHITELIST.includes(user.email);
          // LOGIC: Pending only if NOT whitelisted
          const isPending = !isWhitelisted && user.status === 'pending';
          
          // Defensive Coding for "Ghost Users" (Missing fields)
          const displayName = user.displayName || (user as any).name || user.email?.split('@')[0] || 'Unknown User';
          const displayEmail = user.email || 'No Email';
          const usage = user.totalTokensUsed || 0;
          const usagePercent = Math.min((usage / 50000) * 100, 100);
          
          return (
            <div
              key={user.id || index}
              onClick={() => onUserClick(user)}
              className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md group relative
                ${isPending 
                  ? 'bg-orange-50 border-orange-100' 
                  : isWhitelisted 
                    ? 'bg-white border-gray-100 hover:border-coral/20' 
                    : 'bg-white border-gray-100 hover:border-coral/20'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
                    ${isPending ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-700'}
                  `}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-xs sm:text-sm">{displayName}</h3>
                      {isWhitelisted && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-coral/10 text-coral border border-coral/20">
                          WHITELISTED
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> PENDING APPROVAL
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-mono mt-0.5">{displayEmail.toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  {isWhitelisted ? (
                     <div className="flex flex-col items-end">
                       <span className="text-[10px] sm:text-xs font-bold text-coral flex items-center gap-1">
                         <ShieldCheck className="w-3 h-3" /> UNLIMITED
                       </span>
                       <span className="text-[9px] text-gray-400 mt-1">Global Access</span>
                     </div>
                  ) : isPending ? (
                     <div className="flex flex-col items-end">
                       {/* Explicit Coral "Button" look for pending approval */}
                       <span className="text-[9px] font-black bg-coral text-white px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 hover:bg-[#DC2E4A] transition-colors">
                         APPROVE ACCESS
                       </span>
                     </div>
                  ) : (
                    <>
                      <span className={`text-[10px] sm:text-xs font-bold ${usagePercent > 90 ? 'text-coral' : 'text-gray-600'}`}>
                        {Math.floor(usagePercent)}%
                      </span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${usagePercent > 90 ? 'bg-coral' : 'bg-emerald-500'}`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {sortedUsers.length === 0 && (
          <div className="py-10 text-center opacity-40">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};
