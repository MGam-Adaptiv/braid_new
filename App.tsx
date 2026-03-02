import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudioProvider } from './context/StudioContext';
import { AppLayout } from './components/AppLayout';
import { RoleGuard } from './components/RoleGuard';
import { UserRole } from './types';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import UserProfilePage from './pages/UserProfilePage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { TestPage } from './pages/TestPage';
import { RestoreAccountPage } from './pages/RestoreAccountPage';
import { createUserProfile, getUserProfile } from './services/userService';
import { Toaster } from 'react-hot-toast';

// New Component: Handles redirect logic based on user role at root path
const RootRedirect = () => {
  const { user, loading } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(p => {
        setUserProfile(p);
        setChecking(false);
      });
    } else if (!loading) {
      setChecking(false);
    }
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-coral border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Studio...</p>
      </div>
    );
  }
  
  // If not logged in, show the LandingPage (Root path handles this now)
  if (!user) return <LandingPage />;

  // Intercept users scheduled for deletion
  if (userProfile?.status === 'pending_deletion') {
    return <Navigate to="/restore-account" replace />;
  }
  
  return userProfile?.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/app" replace />;
};

const AppContent = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      createUserProfile(user.uid, user.email, user.displayName);
    }
  }, [user]);

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/test/:id" element={<TestPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* ACCOUNT RESTORATION - Intercept page */}
        <Route path="/restore-account" element={<RestoreAccountPage />} />

        {/* PROTECTED ROUTES - Wrapped in RoleGuard */}
        <Route path="/app/*" element={
          <RoleGuard allowedRoles={[UserRole.TEACHER, UserRole.SCHOOL_OWNER, UserRole.ADMIN]}>
            <StudioProvider>
              <AppLayout />
            </StudioProvider>
          </RoleGuard>
        } />
        
        <Route path="/activities" element={
          <RoleGuard allowedRoles={[UserRole.TEACHER, UserRole.SCHOOL_OWNER, UserRole.ADMIN]}>
            <ActivitiesPage />
          </RoleGuard>
        } />

        <Route path="/materials" element={
          <RoleGuard allowedRoles={[UserRole.TEACHER, UserRole.SCHOOL_OWNER, UserRole.ADMIN]}>
            <MaterialsPage />
          </RoleGuard>
        } />

        <Route path="/profile" element={
          <RoleGuard allowedRoles={[UserRole.TEACHER, UserRole.SCHOOL_OWNER, UserRole.ADMIN]}>
            <UserProfilePage />
          </RoleGuard>
        } />

        <Route path="/settings" element={
          <RoleGuard allowedRoles={[UserRole.TEACHER, UserRole.SCHOOL_OWNER, UserRole.ADMIN]}>
            <SettingsPage />
          </RoleGuard>
        } />
        
        <Route path="/admin" element={
          <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <AdminDashboard />
          </RoleGuard>
        } />

        <Route path="/workspace/:id/*" element={
          <RoleGuard allowedRoles={[UserRole.TEACHER, UserRole.SCHOOL_OWNER, UserRole.ADMIN]}>
            <StudioProvider>
              <AppLayout />
            </StudioProvider>
          </RoleGuard>
        } />
        
        {/* 404 */}
        <Route path="*" element={
          <div className="h-screen flex flex-col items-center justify-center p-20 text-center bg-gray-50">
            <h1 className="text-4xl font-black text-gray-200 uppercase tracking-tighter mb-4">404</h1>
            <p className="font-black uppercase tracking-widest text-gray-400 text-xs">Page not found</p>
            <button 
              onClick={() => window.location.href = '#/'}
              className="mt-8 px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-coral hover:text-coral transition-all"
            >
              Go Home
            </button>
          </div>
        } />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            padding: '16px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
          },
        }}
      />
    </AuthProvider>
  );
};

export default App;