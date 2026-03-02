import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { FileText, Settings, LogOut, User as UserIcon, ChevronDown, BookOpen, Shield, FolderOpen } from 'lucide-react';
import { isUserAdmin } from '../services/userService';
import { db } from '../lib/firebase';

export const Header: React.FC = () => {
  const { user, userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSignOutLoading, setIsSignOutLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingDeletionsCount, setPendingDeletionsCount] = useState(0);
  const [hasImageError, setHasImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = userData?.displayName || userData?.name || user?.displayName || user?.email?.split('@')[0] || 'User';
  
  const rawPhotoURL = userData?.photoURL || user?.photoURL;
  const photoURL = rawPhotoURL ? `${rawPhotoURL}${rawPhotoURL.includes('?') ? '&' : '?'}t=${Date.now()}` : null;
  
  const avatarColor = userData?.avatarColor || '#EF3D5A';

  useEffect(() => {
    setHasImageError(false);
  }, [rawPhotoURL]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const checkAdmin = async () => {
      if (user) {
        const adminStatus = await isUserAdmin(user.uid);
        setIsAdmin(adminStatus);
        
        if (adminStatus) {
          const q = db.collection('users').where('status', '==', 'pending_deletion');
          
          unsubscribe = q.onSnapshot((snapshot) => {
            setPendingDeletionsCount(snapshot.size);
          });
        }
      }
    };
    checkAdmin();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleSignOut = async () => {
    setIsSignOutLoading(true);
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error("Sign out failed", err);
    } finally {
      setIsSignOutLoading(false);
    }
  };

  const showImage = photoURL && !hasImageError;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between z-50">
      <Link to="/app" className="hover:opacity-90 transition-opacity">
        <Logo size="sm" layout="horizontal" />
      </Link>

      <div className="flex items-center gap-3">
        {isAdmin && (
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[#EF3D5A] bg-coral/5 hover:bg-coral/10 transition-colors group relative"
          >
            <Shield className="w-5 h-5 text-coral transition-colors" />
            <span className="hidden md:inline font-black text-[11px] uppercase tracking-widest">Admin Hub</span>
            
            {pendingDeletionsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-white"></span>
              </span>
            )}
          </button>
        )}

        <button 
          onClick={() => navigate('/materials')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[#4B5563] hover:bg-[#F3F4F6] transition-colors group"
        >
          <FolderOpen className="w-5 h-5 text-gray-400 group-hover:text-coral transition-colors" />
          <span className="hidden md:inline font-black text-[11px] uppercase tracking-widest">My Materials</span>
        </button>

        <button 
          onClick={() => navigate('/activities')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[#4B5563] hover:bg-[#F3F4F6] transition-colors group"
        >
          <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-coral transition-colors" />
          <span className="hidden md:inline font-black text-[11px] uppercase tracking-widest">My Activities</span>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm overflow-hidden border border-gray-100"
              style={{ backgroundColor: showImage ? 'transparent' : avatarColor }}
            >
              {showImage ? (
                <img 
                  src={photoURL!} 
                  alt="" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    setHasImageError(true);
                  }}
                />
              ) : (
                displayName[0].toUpperCase()
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in duration-200 origin-top-right overflow-hidden">
              <div className="px-4 py-3 bg-gray-50/50">
                <div className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">
                  {displayName}
                </div>
                <div className="text-[11px] text-gray-500 truncate font-medium">
                  {user?.email}
                </div>
              </div>
              
              <div className="border-t border-gray-100 my-1"></div>
              
              <Link 
                to="/settings" 
                className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsDropdownOpen(false)}
              >
                <Settings className="w-4 h-4 text-gray-400" />
                Settings
              </Link>
              
              <button 
                onClick={handleSignOut}
                disabled={isSignOutLoading}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-coral hover:bg-coral-light/20 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {isSignOutLoading ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
