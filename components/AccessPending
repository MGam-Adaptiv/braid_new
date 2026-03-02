import React, { useState } from 'react';
import { Mail, LogOut, Clock, ShieldCheck, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { db, serverTimestamp } from '../lib/firebase';

export const AccessPending: React.FC = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isRepairing, setIsRepairing] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // --- MANUAL REPAIR FUNCTION ---
  const handleRepair = async () => {
    if (!user) return;
    setIsRepairing(true);
    try {
      console.log("Attempting manual repair for:", user.email);
      // FIX: Use Compat Syntax
      const userRef = db.collection('users').doc(user.uid);
      const docSnap = await userRef.get();
      
      if (!docSnap.exists) {
        const newProfile = {
          uid: user.uid,
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || '',
          role: 'user',
          status: 'pending',
          totalTokensUsed: 0,
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
          lastLogin: serverTimestamp()
        };
        await userRef.set(newProfile);
        alert("Account repaired! You should now be visible to the Admin.");
        window.location.reload(); // Refresh to ensure app picks up the new profile
      } else {
        alert("Your account data is healthy. No repair needed.");
      }
    } catch (error) {
      console.error("Repair failed:", error);
      alert("Repair failed. Check console permissions.");
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      {/* MAIN CARD */}
      <div className="bg-white max-w-md w-full rounded-[32px] shadow-xl border border-gray-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-500">
        <div className="h-1.5 bg-gradient-to-r from-gray-900 via-coral to-gray-900" />
        
        <div className="p-10 text-center">
          
          <div className="mb-8 flex justify-center transform scale-90">
            <Logo size="md" layout="vertical" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-black uppercase tracking-widest mb-6">
            <Clock className="w-3 h-3" /> Status: Pending Approval
          </div>
          
          <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">
            You’re on the list
          </h2>
          
          <p className="text-sm font-medium text-gray-500 leading-relaxed mb-10 px-2">
            Thanks for signing up. We’ve received your request to join the <span className="text-gray-900 font-bold">BraidStudio Private Beta</span>. 
            We’re reviewing applications in batches to ensure a high-quality experience.
          </p>
          
          {/* CONTACT BOX */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8">
            <h3 className="text-[10px] font-black text-gray-900 mb-2 flex items-center justify-center gap-2 uppercase tracking-widest">
              <Mail className="w-3 h-3" /> Have a question?
            </h3>
            <p className="text-[10px] text-gray-500 mb-2 font-medium">
              Reach out to us regarding your application:
            </p>
            <a 
              href="mailto:info@braidstudio.getadaptiv.com"
              className="text-coral font-bold text-xs hover:underline block truncate transition-colors"
            >
              info@braidstudio.getadaptiv.com
            </a>
          </div>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleLogout}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-coral flex items-center justify-center gap-2 transition-colors mx-auto"
            >
              <LogOut className="w-3 h-3" /> Log Out
            </button>

            {/* REPAIR BUTTON */}
            <button 
              onClick={handleRepair} 
              disabled={isRepairing}
              className="text-[10px] font-bold text-coral/60 hover:text-coral flex items-center justify-center gap-1.5 transition-colors mt-2"
            >
              <Wrench className="w-3 h-3" /> {isRepairing ? 'Fixing...' : 'Trouble? Repair Account'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="mt-8 text-center opacity-40 hover:opacity-100 transition-opacity duration-300">
         <span className="text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase flex items-center gap-2 justify-center">
           <ShieldCheck size={12} /> Braid Studio
         </span>
      </div>
    </div>
  );
};
