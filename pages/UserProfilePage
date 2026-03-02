import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Settings, Shield, ExternalLink, LogOut, Bell, Key, ArrowLeft, Infinity as InfinityIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserProfilePage() {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = userProfile?.role === 'admin' || user?.email === 'admin@braidstudio.com';
  const isVIP = user?.email === 'teacher@test.com' || userProfile?.isWhitelisted;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  if (!user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-black uppercase tracking-widest text-gray-400">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans p-6 md:p-10">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        {/* TOP NAVIGATION BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Smart Back Button */}
          {isAdmin ? (
            <button 
              onClick={() => handleNavigation('/admin')}
              className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors w-fit"
            >
              <div className="p-2 bg-white border border-gray-200 rounded-lg group-hover:border-gray-300 shadow-sm transition-all">
                <ArrowLeft className="w-4 h-4" /> 
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest">Back to Admin Hub</span>
            </button>
          ) : (
            <button 
              onClick={() => handleNavigation('/app')}
              className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors w-fit"
            >
              <div className="p-2 bg-white border border-gray-200 rounded-lg group-hover:border-gray-300 shadow-sm transition-all">
                <ArrowLeft className="w-4 h-4" /> 
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest">Back to Workspace</span>
            </button>
          )}

          {/* Teacher Platform Link (FIXED LINK) */}
          <button 
            onClick={() => handleNavigation('/app')}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:text-coral hover:border-coral/30 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            Go to Teachers Platform
          </button>
        </div>

        {/* PAGE TITLE */}
        <div>
           <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">My Profile</h1>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Manage your identity and platform access</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Identity Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-gray-100/50 border border-gray-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-coral" />
              <div className="w-28 h-28 mx-auto rounded-full flex items-center justify-center text-white text-4xl font-black mb-6 shadow-2xl border-4 border-white ring-1 ring-gray-100" 
                   style={{ backgroundColor: userProfile?.avatarColor || '#EF3D5A' }}>
                {userProfile?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">{userProfile?.displayName || 'User'}</h2>
              <p className="text-[10px] font-mono text-gray-400 mb-6 truncate px-2">{user.email}</p>
              
              <div className="flex justify-center gap-2 mb-8">
                <span className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-gray-200">
                  {userProfile?.role || 'Teacher'}
                </span>
                {isAdmin && (
                  <span className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md">
                    <Shield className="w-3 h-3" /> Root
                  </span>
                )}
              </div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-gray-100 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
            
            {/* Token Usage Card */}
            <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Monthly Usage</h3>
              
              {isAdmin || isVIP ? (
                <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 animate-in fade-in zoom-in duration-300">
                  <InfinityIcon className="w-8 h-8" />
                  <div>
                    <div className="font-black text-lg uppercase tracking-tight leading-none">Unlimited</div>
                    <div className="text-[9px] text-emerald-600/60 font-black uppercase tracking-widest mt-1">VIP / Admin Access</div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-black text-gray-900 tracking-tight">{userProfile?.totalTokensUsed?.toLocaleString() || 0}</span>
                    <span className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">/ 50k</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div 
                       className={`h-full transition-all duration-1000 ${userProfile?.totalTokensUsed > 40000 ? 'bg-coral' : 'bg-blue-500'}`} 
                       style={{ width: `${Math.min(((userProfile?.totalTokensUsed || 0) / 50000) * 100, 100)}%` }}
                     />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Settings */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 text-xs">
                  <Settings className="w-4 h-4 text-gray-400" /> Account Settings
                </h3>
              </div>
              
              <div className="divide-y divide-gray-100">
                <SettingsRow 
                  icon={<User className="w-5 h-5" />} 
                  title="Personal Information" 
                  desc="Update your name and profile color" 
                  color="blue"
                  onAction={() => handleNavigation('/settings')}
                />
                <SettingsRow 
                  icon={<Bell className="w-5 h-5" />} 
                  title="Notifications" 
                  desc="Manage email alerts and activity updates" 
                  color="green"
                />
                <SettingsRow 
                  icon={<Key className="w-5 h-5" />} 
                  title="Security" 
                  desc="Change password and 2FA settings" 
                  color="orange"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const SettingsRow = ({ icon, title, desc, color, onAction }: any) => {
  const colorStyles: any = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition cursor-pointer flex items-center justify-between group" onClick={onAction}>
      <div className="flex items-center gap-5">
        <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${colorStyles[color]}`}>
          {icon}
        </div>
        <div>
          <div className="text-[13px] font-black text-gray-900 uppercase tracking-tight">{title}</div>
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">{desc}</div>
        </div>
      </div>
      <button className="text-[10px] font-black uppercase tracking-widest text-coral opacity-0 group-hover:opacity-100 transition-all hover:underline">Manage</button>
    </div>
  );
};
