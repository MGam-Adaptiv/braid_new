
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { getUserProfile } from '../services/userService';
import { AccessPending } from './AccessPending';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userStatus, setUserStatus] = useState<string>('approved'); 
  const [roleLoading, setRoleLoading] = useState(true);

  const fetchRole = async () => {
    if (!user) {
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    try {
      const profile = await getUserProfile(user.uid);
      const whitelist = ['teacher@test.com', 'admin@braidstudio.com'];

      // 1. Whitelist Safety Net: Always approve specific emails
      if (user.email && whitelist.includes(user.email)) {
        setUserRole(UserRole.ADMIN);
        setUserStatus('approved');
      } 
      else if (profile) {
        // 2. Strict Ban Enforcement
        if (profile.status === 'banned') {
          console.warn(`RoleGuard: User ${user.email} is banned. Forcing logout.`);
          await signOut();
          navigate('/login');
          return;
        }

        // Map Firestore string role to UserRole enum
        const role = profile.role as unknown as UserRole;
        setUserRole(role);
        setUserStatus(profile.status || 'approved');
      } else {
        // Default to teacher if profile doesn't exist yet (race condition)
        setUserRole(UserRole.TEACHER);
        setUserStatus('pending'); 
      }
    } catch (error) {
      console.error("Error fetching user role for guard:", error);
      setUserRole(UserRole.TEACHER);
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchRole();
    }
  }, [user, authLoading]);

  if (authLoading || roleLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-coral border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verifying Workspace Permissions...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // INTERCEPT: Deletion Grace Period
  if (userStatus === 'pending_deletion') {
    return <Navigate to="/restore-account" replace />;
  }

  // --- PRIORITY 2: PASSIVE WAITLIST GATE ---
  if (userStatus === 'pending') {
    return <AccessPending />;
  }

  // Check if the resolved role is in the allowed list
  const hasPermission = userRole && allowedRoles.includes(userRole);

  if (!hasPermission) {
    console.warn("DEBUG: RoleGuard BLOCKED access to", location.pathname, "- Actual Role:", userRole, "Required one of:", allowedRoles);
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-white">
        <div className="w-16 h-16 bg-coral/10 text-coral rounded-[24px] flex items-center justify-center mb-6 shadow-lg shadow-coral/5">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Access Restricted</h2>
        <p className="text-medium-gray max-w-md text-sm font-medium leading-relaxed">
          Your account ({userRole}) does not have permission to view this area. 
          Please contact the platform owner if you believe this is an error.
        </p>
        <button 
          onClick={() => navigate('/app')}
          className="mt-10 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-black/10 active:scale-95"
        >
          Return to Workspace
        </button>
      </div>
    );
  }

  // PRIORITY 3: ACTIVE ACCESS
  return <>{children}</>;
};
