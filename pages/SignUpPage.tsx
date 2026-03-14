import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Check, AlertCircle } from 'lucide-react';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Custom alert state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedEmail = email.trim();
    const sanitizedDisplayName = displayName.trim();
    
    if (!sanitizedDisplayName || !sanitizedEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    
    // Validation: Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsSigningUp(true);
      setError(null);
      
      // Use Modular Auth Context method (handles auth + user doc creation)
      await signup(sanitizedEmail, password, sanitizedDisplayName);

      setConfirmDialog({
        isOpen: true,
        title: 'Account Created',
        message: 'Your account has been created and is pending approval. You will be notified once an admin grants access.',
        onConfirm: () => navigate('/login')
      });
      
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Failed to create account.");
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans pb-[env(safe-area-inset-bottom)] sm:justify-center">
      {/* Custom Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={32} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-gray-900">{confirmDialog.title}</h3>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-8">{confirmDialog.message}</p>
            <button
              type="button"
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-black transition-all"
              onClick={confirmDialog.onConfirm}
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

      <div className="pt-8 pb-6 px-5 sm:pt-12 sm:pb-8 flex flex-col items-center text-center">
        <Logo size="md" layout="vertical" />
        <p className="text-[#9CA3AF] text-[10px] sm:text-xs tracking-[0.2em] font-bold uppercase mt-4">
          BRAIDING TEACHER CREATIVITY WITH AI
        </p>
        <a
          href="/landing.html"
          className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9CA3AF] hover:text-black transition-colors tracking-wide"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to website
        </a>
      </div>

      <div className="flex-1 sm:flex-none flex items-start sm:items-center justify-center px-0 sm:px-6 mb-12">
        <div className="w-full sm:max-w-[420px] bg-white sm:rounded-[24px] sm:shadow-xl p-6 sm:p-10 border-t border-b sm:border border-gray-100">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-[12px] font-black tracking-widest uppercase text-black">CREATE NEW ACCOUNT</span>
          </div>

          <div className="mb-6">
            <GoogleAuthButton />
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB]"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-white px-3 text-[#9CA3AF]">OR USE EMAIL</span>
            </div>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-[#9CA3AF] uppercase">DISPLAY NAME</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ms. Johnson" className="w-full h-[54px] px-5 bg-white border border-[#E5E7EB] rounded-xl text-base focus:border-coral outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-[#9CA3AF] uppercase">EMAIL</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" className="w-full h-[54px] px-5 bg-white border border-[#E5E7EB] rounded-xl text-base focus:border-coral outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-[#9CA3AF] uppercase">PASSWORD</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full h-[54px] px-5 bg-white border border-[#E5E7EB] rounded-xl text-base focus:border-coral outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-[#9CA3AF] uppercase">CONFIRM PASSWORD</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full h-[54px] px-5 bg-white border border-[#E5E7EB] rounded-xl text-base focus:border-coral outline-none transition-all" />
            </div>

            {error && <div className="text-[11px] font-black text-coral text-center py-2 animate-in fade-in">{error}</div>}

            <button type="submit" disabled={isSigningUp} className="w-full bg-black text-white h-[56px] rounded-xl font-black text-[13px] tracking-widest uppercase flex items-center justify-center gap-2.5 transition-all disabled:opacity-50">
              {isSigningUp ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : "CREATE ACCOUNT"}
            </button>
          </form>

          <p className="text-[11px] text-[#9CA3AF] text-center mt-8 font-bold">
            Already have an account? <Link to="/login" className="text-coral hover:underline">LOG IN</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
