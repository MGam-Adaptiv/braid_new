import firebase from 'firebase/compat/app';
import { db } from '../lib/firebase';

export const trackTokenUsage = async (userId: string, tokensUsed: number, actionType: string) => {
  if (!userId || !tokensUsed) return;

  try {
    const batch = db.batch();

    // 1. Increment totalTokensUsed on user document
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      totalTokensUsed: firebase.firestore.FieldValue.increment(tokensUsed),
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Add to tokenLogs subcollection
    const logRef = userRef.collection('tokenLogs').doc();
    batch.set(logRef, {
      tokens: tokensUsed,
      actionType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    console.log(`Tracked ${tokensUsed} tokens for ${actionType}`);
  } catch (error) {
    // Fail silently so we don't block the main app flow
    console.error('Failed to track token usage:', error);
  }
};
