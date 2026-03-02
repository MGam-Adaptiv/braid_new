import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider, serverTimestamp } from '../lib/firebase';

export const GoogleAuthButton: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      // 1. Trigger Compat Google Sign-In
      const result = await auth.signInWithPopup(googleProvider);
      const user = result.user;

      if (user) {
        // 2. Compat Database Check
        const userRef = db.collection('users').doc(user.uid);
        const userSnap = await userRef.get();

        if (userSnap.exists) {
          console.log('Returning user');
        } else {
          // 3. Create Document if it doesn't exist (Compat)
          console.log('Creating new user profile...');
          await userRef.set({
            name: user.displayName || 'User',
            email: user.email || '',
            role: 'teacher',
            status: 'pending',
            tokens: 0,
            createdAt: serverTimestamp()
          });
        }
        
        // 4. Redirect
        navigate('/app');
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("Sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="w-full min-h-[56px] flex items-center justify-center gap-3 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] font-bold text-[13px] tracking-wide uppercase py-3 px-5 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      ) : (
        <img 
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
          className="w-5 h-5" 
          alt="G" 
        />
      )}
      Sign in with Google
    </button>
  );
};
