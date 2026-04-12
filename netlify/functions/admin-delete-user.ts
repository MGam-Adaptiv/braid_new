import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';

// Initialise Firebase Admin once per cold start
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://braid.studio',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  // Verify Firebase ID token + admin role
  const authHeader = event.headers['authorization'];
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
    if (callerDoc.data()?.role !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
    }
  } catch {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  try {
    const { uid, action } = JSON.parse(event.body || '{}');

    if (!uid) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing uid' }) };

    if (action === 'delete') {
      try {
        await admin.auth().deleteUser(uid);
      } catch (authErr: any) {
        if (authErr.code !== 'auth/user-not-found') throw authErr;
        // Auth user already gone — still clean up Firestore below
      }
      await admin.firestore().collection('users').doc(uid).delete();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'User deleted' }) };
    }

    if (action === 'disable') {
      await admin.auth().updateUser(uid, { disabled: true });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'User disabled in Firebase Auth' }) };
    }

    if (action === 'enable') {
      await admin.auth().updateUser(uid, { disabled: false });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'User enabled in Firebase Auth' }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err: any) {
    console.error('admin-delete-user error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'An internal error occurred. Please try again.' }) };
  }
};

export { handler };


