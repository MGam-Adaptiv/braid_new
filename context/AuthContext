import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider, serverTimestamp } from '../lib/firebase';
import { User } from 'firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  userData: any | null;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
  // Aliases
  user: User | null;
  userProfile: any | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. SIGNUP
  const signup = async (email: string, password: string, fullName: string) => {
    const res = await auth.createUserWithEmailAndPassword(email, password);
    if (res.user) {
      await db.collection('users').doc(res.user.uid).set({
        name: fullName,
        email: email,
        role: 'teacher',
        status: 'pending',
        tokens: 0,
        createdAt: serverTimestamp(),
        uid: res.user.uid
      });
    }
  };

  // 2. LOGIN
  const login = async (email: string, password: string) => {
    await auth.signInWithEmailAndPassword(email, password);
  };

  // 3. GOOGLE LOGIN
  const loginWithGoogle = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const res = await auth.signInWithPopup(googleProvider);
      if (res.user) {
        const userRef = db.collection('users').doc(res.user.uid);
        const docSnap = await userRef.get();
        if (!docSnap.exists) {
          await userRef.set({
            name: res.user.displayName || 'User',
            email: res.user.email || '',
            role: 'teacher',
            status: 'pending',
            tokens: 0,
            createdAt: serverTimestamp(),
            uid: res.user.uid
          });
        }
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  };

  // 4. LOGOUT
  const logout = async () => {
    try {
      await auth.signOut();
      // We manually clear state here to ensure UI updates immediately
      setUserData(null);
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // 5. RESET PASSWORD
  const resetPassword = async (email: string) => {
    try {
      await auth.sendPasswordResetEmail(email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // MONITOR AUTH STATE
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user as User);
        
        // Start listening to the user profile
        unsubscribeUserDoc = db.collection('users').doc(user.uid).onSnapshot(
          (docSnap) => {
            if (docSnap.exists) {
              setUserData(docSnap.data());
            } else {
              setUserData(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("User Listener Error:", error);
            setLoading(false);
          }
        );
      } else {
        // User is logged out
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    loading,
    user: currentUser,
    userProfile: userData,
    signInWithGoogle: loginWithGoogle,
    signInWithEmail: login,
    signUpWithEmail: (e: string, p: string) => signup(e, p, 'User'),
    signOut: logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
