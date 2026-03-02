import { db, serverTimestamp, increment, arrayUnion } from '../lib/firebase';

export interface UserProfile {
  email: string;
  role: 'admin' | 'teacher' | 'user';
  status: 'pending' | 'approved' | 'rejected' | 'banned' | 'pending_deletion';
  displayName: string;
  createdAt?: any;
  lastLogin?: any;
  totalTokensUsed?: number;
  bonusTokens?: number;
  isWhitelisted?: boolean;
  lastResetDate?: any;
  id?: string;
  uid?: string;
  photoURL?: string;
  avatarColor?: string;
  lastActive?: any;
  schoolLogoURL?: string;
  schoolName?: string;
  bio?: string;
  gradeLevels?: string;
  deletionRequestedAt?: any;
  customPublishers?: string[];
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!userId) return null;
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data() as any;
      return {
        ...data,
        status: data.status || 'approved'
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.debug('User profile not found or inaccessible:', userId);
    return null;
  }
};

export const isUserAdmin = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  const profile = await getUserProfile(userId);
  return profile?.role === 'admin';
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const snapshot = await db.collection('users').get();
    
    const users = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        id: docSnap.id,
        email: data.email || '',
        displayName: data.displayName || data.name || data.email?.split('@')[0] || 'Unknown User',
        photoURL: data.photoURL || '',
        avatarColor: data.avatarColor || '#EF3D5A',
        role: data.role || 'user',
        status: ['teacher@test.com', 'admin@braidstudio.com'].includes(data.email) 
          ? 'approved' 
          : (data.status || 'pending'),
        totalTokensUsed: data.totalTokensUsed || 0,
        bonusTokens: data.bonusTokens || 0,
        isWhitelisted: data.isWhitelisted || false,
        lastActive: data.lastActive || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        schoolLogoURL: data.schoolLogoURL || '',
      } as UserProfile;
    });
    return users;
  } catch (error) { 
    console.error('Error fetching users:', error); 
    return []; 
  } 
};

export const createUserProfile = async (
  userId: string, 
  email: string | null, 
  displayName?: string | null,
  photoURL?: string | null
): Promise<void> => {
  if (!userId) return;
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log(`userService: Creating new profile for ${email} with status: pending`);
      
      const name = displayName || (email ? email.split('@')[0] : 'User');

      await userRef.set({
        email: email || '',
        displayName: name,
        photoURL: photoURL || '',
        avatarColor: '#EF3D5A',
        role: 'teacher',
        status: 'pending',
        totalTokensUsed: 0,
        bonusTokens: 0,
        isWhitelisted: false,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        lastLogin: serverTimestamp(),
        lastResetDate: serverTimestamp(),
      }, { merge: true });
    } else {
      try {
        await userRef.update({
          lastLogin: serverTimestamp(),
          lastActive: serverTimestamp()
        });
      } catch (e) {
        console.debug('Non-critical: Could not update activity timestamp.', e);
      }
    }
  } catch (error) {
    console.error('userService: Error creating/updating user profile:', error);
  }
};

export const incrementUserTokenUsage = async (userId: string, tokens: number): Promise<void> => {
  if (!userId) return;
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      totalTokensUsed: increment(tokens),
      lastActive: serverTimestamp()
    });
  } catch (error) {
    console.error('userService: Error incrementing token usage:', error);
  }
};

export const updateUserUsage = async (userId: string, newUsage: number): Promise<void> => {
  if (!userId) return;
  try {
    await db.collection('users').doc(userId).update({
      totalTokensUsed: newUsage
    });
  } catch (error) {
    console.error('userService: Error updating user usage:', error);
    throw error;
  }
};

export const approveUserAccess = async (userId: string): Promise<void> => {
  if (!userId) return;
  try {
    await db.collection('users').doc(userId).update({
      status: 'approved'
    });
  } catch (error) {
    console.error('userService: Error approving user:', error);
    throw error;
  }
};

export const checkUsageLimit = async (userId: string, email?: string | null): Promise<{ allowed: boolean; usage: number }> => {
  if (!userId) return { allowed: false, usage: 0 };
  
  if (email && (email === 'teacher@test.com' || email === 'admin@braidstudio.com')) {
    return { allowed: true, usage: 0 };
  }

  const userRef = db.collection('users').doc(userId);

  try {
    return await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(userRef);
      if (!docSnap.exists) {
        return { allowed: false, usage: 0 };
      }

      const data = docSnap.data() as UserProfile;
      
      if (data.status === 'pending' || data.status === 'rejected') {
         return { allowed: false, usage: 0 };
      }

      let currentUsage = data.totalTokensUsed || 0;
      
      const createdAtTimestamp = data.createdAt;
      const createdAt = createdAtTimestamp && createdAtTimestamp.toDate ? createdAtTimestamp.toDate() : new Date();
      
      const lastResetTimestamp = data.lastResetDate || createdAtTimestamp;
      const lastResetDate = lastResetTimestamp && lastResetTimestamp.toDate ? lastResetTimestamp.toDate() : createdAt;
      
      const now = new Date();
      const resetDay = createdAt.getDate();
      
      let currentCycleStart = new Date(now.getFullYear(), now.getMonth(), resetDay);
      
      if (now.getDate() < resetDay) {
        currentCycleStart.setMonth(currentCycleStart.getMonth() - 1);
      }

      if (lastResetDate.getTime() < currentCycleStart.getTime()) {
        console.log(`🔄 Lazy Reset Triggered for ${email}. Resetting usage.`);
        
        transaction.update(userRef, {
          totalTokensUsed: 0,
          bonusTokens: 0, // Reset gifted tokens at the start of a new month
          lastResetDate: serverTimestamp()
        });
        
        return { allowed: true, usage: 0 };
      }

      const limit = 50000 + (data.bonusTokens || 0);

      if (currentUsage >= limit) {
        return { allowed: false, usage: currentUsage };
      }
      
      return { allowed: true, usage: currentUsage };
    });
  } catch (error) {
    console.error('userService: Transaction failed in checkUsageLimit:', error);
    return { allowed: false, usage: 50000 };
  }
};

export const addCustomPublisher = async (userId: string, publisher: string): Promise<void> => {
  if (!userId || !publisher) return;
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      customPublishers: arrayUnion(publisher)
    });
  } catch (error) {
    console.error('Error saving custom publisher:', error);
  }
};
