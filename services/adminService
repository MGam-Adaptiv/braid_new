import { db, serverTimestamp } from '../lib/firebase';
import { UserProfile } from './userService';

export interface PlatformStats {
  totalUsers: number;
  totalActivities: number;
  activitiesToday: number;
  activeUsers: number;
  globalTokenUsage: number;
  publisherInsights: any[]; // List of assets for analysis
}

/**
 * Fetches platform-wide statistics by aggregating data across users, activities, and assets.
 */
export const getPlatformStats = async (): Promise<PlatformStats> => {
  console.log('adminService: Fetching platform statistics...');
  
  const stats: PlatformStats = {
    totalUsers: 0,
    totalActivities: 0,
    activitiesToday: 0,
    activeUsers: 0,
    globalTokenUsage: 0,
    publisherInsights: []
  };

  try {
    // 1. Fetch Users
    try {
      const usersSnapshot = await db.collection('users').get();
      stats.totalUsers = usersSnapshot.size;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      stats.activeUsers = usersSnapshot.docs.filter(doc => {
        const u = doc.data();
        let lastLoginDate: Date | null = null;
        if (u.lastLogin?.toDate) {
          lastLoginDate = u.lastLogin.toDate();
        } else if (u.lastLogin) {
          lastLoginDate = new Date(u.lastLogin);
        }
        return lastLoginDate && lastLoginDate >= oneWeekAgo;
      }).length;

    } catch (userError) {
      console.warn('Admin: Failed to fetch users', userError);
    }

    // 2. Fetch Activities
    try {
      const activitiesSnapshot = await db.collection('activities').get();
      stats.totalActivities = activitiesSnapshot.size;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      activitiesSnapshot.forEach(doc => {
        const data = doc.data();
        let createdAtDate: Date | null = null;
        if (data.createdAt?.toDate) {
          createdAtDate = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAtDate = new Date(data.createdAt);
        }

        if (createdAtDate && createdAtDate >= today) {
          stats.activitiesToday++;
        }
      });

      // 3. Calculate Token Usage & Publisher Insights
      // Try contentAssets first (Pre-aggregated)
      const assetsSnapshot = await db.collection('contentAssets').get();
      let totalTokens = 0;
      let assets: any[] = [];

      if (!assetsSnapshot.empty) {
        assets = assetsSnapshot.docs.map(doc => {
          const data = doc.data();
          totalTokens += (data.totalTokens || 0);
          return { id: doc.id, ...data };
        });
      } else {
        // Fallback: Aggregate from Activities directly if contentAssets is empty
        console.log("Admin: contentAssets empty, aggregating from activities for insights.");
        totalTokens = stats.totalActivities * 2500; // Estimated 2.5k tokens per activity
        
        // Derive asset insights from activity sources
        const assetMap: Record<string, any> = {};
        activitiesSnapshot.forEach(doc => {
          const act = doc.data();
          const title = act.source?.bookTitle || 'Unknown';
          if (!assetMap[title]) {
            assetMap[title] = { id: title, bookTitle: title, publisher: act.source?.publisher || 'Unknown', usageCount: 0 };
          }
          assetMap[title].usageCount++;
        });
        assets = Object.values(assetMap);
      }

      stats.globalTokenUsage = totalTokens;
      stats.publisherInsights = assets;

    } catch (actError) {
      console.warn('Admin: Failed to fetch activities/assets', actError);
    }

    return stats;

  } catch (error) {
    console.error('adminService: Critical failure in stats aggregation:', error);
    return stats;
  }
};

/**
 * DATA FLYWHEEL INITIALIZER
 * Manually seeds the system with "Digital Twin" documents using forceful writes.
 */
export const initializeDigitalTwins = async () => {
  console.log('🚀 Initializing Data Flywheel...');
  
  try {
    // 1. Define Digital Twin Assets with Mock Flags and Token Counts
    const assets = [
      {
        id: 'FullBlast Plus 4',
        data: {
          bookTitle: 'FullBlast Plus 4',
          publisher: 'MM Publications',
          usageCount: 45,
          remixScore: 82, 
          totalTokens: 15400,
          vocabularyUsed: ['pollution', 'environment', 'recycle', 'single-use', 'landfill'],
          grammarUsed: ['Future Will', 'Going to', 'Zero Conditional'],
          lastUsed: serverTimestamp(),
          totalRemixes: 12, 
          totalInteractions: 45,
          cumulativeDelta: 8200,
          lastInteractionTimestamp: serverTimestamp(),
          isMock: true
        }
      },
      {
        id: 'English File B1',
        data: {
          bookTitle: 'English File B1',
          publisher: 'Oxford University Press',
          usageCount: 112,
          remixScore: 45, 
          totalTokens: 42000,
          vocabularyUsed: ['travel', 'experience', 'booking', 'accommodation', 'reservation'],
          grammarUsed: ['Present Perfect', 'Past Simple'],
          lastUsed: serverTimestamp(),
          totalRemixes: 28,
          totalInteractions: 112,
          cumulativeDelta: 15400,
          lastInteractionTimestamp: serverTimestamp(),
          isMock: true
        }
      },
      {
        id: 'Focus 2',
        data: {
          bookTitle: 'Focus 2',
          publisher: 'Pearson',
          usageCount: 18,
          remixScore: 12, 
          totalTokens: 5600,
          vocabularyUsed: ['wake up', 'get dressed', 'routine', 'breakfast', 'commute'],
          grammarUsed: ['Present Simple', 'Adverbs of Frequency'],
          lastUsed: serverTimestamp(),
          totalRemixes: 5,
          totalInteractions: 18,
          cumulativeDelta: 1200,
          lastInteractionTimestamp: serverTimestamp(),
          isMock: true
        }
      }
    ];

    // 2. Sequential Force-Write (No Batch) to ensure seeding
    for (const asset of assets) {
      await db.collection('contentAssets').doc(asset.id).set(asset.data, { merge: true });
      console.log(`✅ Seeded: ${asset.id}`);
    }

    // 3. System Stats (Magic Link Pings & Total Tokens)
    await db.collection('system').doc('global_stats').set({ 
      magicLinkPings: 154,
      totalTokens: 145000, 
      updatedAt: serverTimestamp(),
      isMock: true
    }, { merge: true });
    console.log('✅ Seeded: Global Stats (Pings: 154, Tokens: 145k)');

  } catch (error) {
    console.error("Flywheel Initialization Failed:", error);
    throw error;
  }
};

export const updateUserRole = async (userId: string, newRole: 'admin' | 'teacher'): Promise<void> => {
  try {
    await db.collection('users').doc(userId).update({
      role: newRole,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('adminService: Error updating user role:', error);
    throw error;
  }
};

export const cancelDeletionRequest = async (userId: string): Promise<void> => {
  try {
    // Note: To delete a field in Modular SDK, we normally import deleteField().
    // But updateDoc handles it if we pass the sentinel.
    // Importing deleteField dynamically to avoid top-level issues if needed, or just setting to null for now as fallback.
    await db.collection('users').doc(userId).update({
      status: 'approved',
      deletionRequestedAt: null, // Simple nullify for now to avoid complexity
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('adminService: Error canceling deletion request:', error);
    throw error;
  }
};

export const deleteActivityGlobally = async (activityId: string): Promise<void> => {
  try {
    await db.collection('activities').doc(activityId).delete();
  } catch (error) {
    console.error('adminService: Error deleting activity globally:', error);
    throw error;
  }
};
