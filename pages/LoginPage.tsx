import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { auth, db } from '../lib/firebase';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, login, currentUser, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      setError(null);
      
      await loginWithGoogle();
      
      const user = auth.currentUser;
      if (user) {
        const docRef = db.collection('users').doc(user.uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
          const status = docSnap.data()?.status;
          if (status === 'banned') {
            await auth.signOut();
            setError("Your account has been banned, contact admin at info@braidstudio.getadaptiv.com");
            setIsLoggingIn(false);
            return;
          }
          if (status === 'pending_deletion') {
            navigate('/restore-account');
            return;
          }
        }
        navigate('/');
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError("Google authentication failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedEmail = email.trim();
    
    if (!sanitizedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setIsLoggingIn(true);
      setError(null);
      
      await login(sanitizedEmail, password);
      
      const user = auth.currentUser;
      if (user) {
        const docRef = db.collection('users').doc(user.uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
          const status = docSnap.data()?.status;
          if (status === 'banned') {
            await auth.signOut();
            setError("Your account has been banned, contact admin at info@braidstudio.getadaptiv.com");
            setIsLoggingIn(false);
            return;
          }
          if (status === 'pending_deletion') {
            navigate('/restore-account');
            return;
          }
        }
        navigate('/');
      }
    } catch (err: any) {
      console.error("Email Login Error:", err);
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Try again later.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async () => {
    const sanitizedEmail = resetEmail.trim();
    if (!sanitizedEmail) {
      setResetError("Please enter your email address.");
      return;
    }

    try {
      setResetError(null);
      await resetPassword(sanitizedEmail);
      setResetSuccess(true);
    } catch (err: any) {
      console.error("Password Reset Error:", err);
      // Security: Don't reveal if user exists or not
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setResetSuccess(true);
      } else if (err.code === 'auth/invalid-email') {
        setResetError("Please enter a valid email address.");
      } else if (err.code === 'auth/too-many-requests') {
        setResetError("Too many requests. Please try again later.");
      } else {
        setResetError("Something went wrong. Please try again.");
      }
    }
  };

  useEffect(() => {
    // Check status if already logged in
    if (currentUser && !isLoggingIn) {
      const docRef = db.collection('users').doc(currentUser.uid);
      docRef.get().then(docSnap => {
        if (docSnap.exists && docSnap.data()?.status === 'pending_deletion') {
          navigate('/restore-account');
        } else {
          navigate('/');
        }
      });
    }
  }, [currentUser, isLoggingIn, navigate]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans pb-[env(safe-area-inset-bottom)] sm:justify-center">
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
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[12px] font-black tracking-widest uppercase text-black">LOG IN TO STUDIO</span>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="w-full min-h-[56px] flex items-center justify-center gap-3 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] font-bold text-[13px] tracking-wide uppercase py-3 px-5 rounded-xl transition-all mb-6 disabled:opacity-50 active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
            CONTINUE WITH GOOGLE
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB]"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-white px-3 text-[#9CA3AF]">OR USE EMAIL</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-[#9CA3AF] uppercase">EMAIL</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full h-[54px] px-5 bg-white border border-[#E5E7EB] rounded-xl text-base focus:border-coral focus:ring-4 focus:ring-coral/5 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-[#9CA3AF] uppercase">PASSWORD</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[54px] pl-5 pr-12 bg-white border border-[#E5E7EB] rounded-xl text-base focus:border-coral focus:ring-4 focus:ring-coral/5 outline-none transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-black"
                >
                  {showPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L4.573 4.574m14.853 14.853L14.12 14.12M17.657 16.657L13.414 12.414m6.344-7.956L21.542 12c-1.274 4.057-5.064 7-9.542 7-1.127 0-2.203-.187-3.2-.533m12.443-12.243a9.954 9.954 0 00-3.2-.533M2.458 12C3.732 7.943 7.523 5 12 5c1.127 0 2.203.187 3.2.533m-12.742 6.467l5.307 5.307" /></svg>}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetEmail(email);
                    setResetSuccess(false);
                    setResetError(null);
                  }}
                  className="text-[11px] font-bold text-[#9CA3AF] hover:text-black transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[11px] font-black text-coral text-center py-2 animate-in fade-in slide-in-from-top-1 bg-coral/5 rounded-lg border border-coral/20">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-black hover:bg-[#1F2937] text-white h-[56px] rounded-xl font-black text-[13px] tracking-widest uppercase flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoggingIn ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : "LOG IN"}
            </button>
          </form>

          <p className="text-[11px] text-[#9CA3AF] text-center mt-8 font-bold">
            Don't have an account? <Link to="/signup" className="text-coral hover:underline">SIGN UP</Link>
          </p>
        </div>
      </div>
      <footer className="py-6 text-center">
        <span className="text-[10px] text-[#9CA3AF] font-black tracking-widest">
          Braid Studio, built with ❤️ by Adaptiv Personalised Learning
        </span>
      </footer>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-[24px] shadow-xl p-8 w-full max-w-[400px]">
            <div className="text-[12px] font-black tracking-widest uppercase text-black mb-6 text-center">
              RESET PASSWORD
            </div>

            {resetSuccess ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-sm text-[#374151] font-bold mb-2">Check your inbox</h3>
                <p className="text-xs text-[#9CA3AF] mb-6">
                  If an account exists for that email, we've sent password reset instructions.
                </p>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full bg-black text-white h-[48px] rounded-xl font-black text-[12px] tracking-widest uppercase hover:bg-[#1F2937] transition-all"
                >
                  BACK TO LOGIN
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-xs text-[#9CA3AF] mb-5 text-center">
                  Enter your email and we'll send you a link to reset your password.
                </p>
                
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[10px] font-black tracking-widest text-[#9CA3AF] uppercase">EMAIL</label>
                  <input 
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleResetPassword();
                      }
                    }}
                    placeholder="you@school.edu"
                    className="w-full h-[54px] px-5 bg-white border border-[#E5E7EB] rounded-xl text-base focus:border-coral focus:ring-4 focus:ring-coral/5 outline-none transition-all"
                  />
                </div>

                {resetError && (
                  <div className="text-[11px] font-black text-coral text-center py-2 mb-3 bg-coral/5 rounded-lg border border-coral/20">
                    {resetError}
                  </div>
                )}

                <button 
                  onClick={handleResetPassword}
                  className="w-full bg-black text-white h-[48px] rounded-xl font-black text-[12px] tracking-widest uppercase mb-3 hover:bg-[#1F2937] transition-all"
                >
                  SEND RESET LINK
                </button>
                
                <button 
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full bg-white text-[#9CA3AF] h-[48px] border border-[#E5E7EB] rounded-xl font-bold text-[12px] tracking-widest uppercase hover:text-black transition-all"
                >
                  CANCEL
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
