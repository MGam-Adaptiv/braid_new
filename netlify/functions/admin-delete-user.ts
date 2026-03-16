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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { uid, action } = JSON.parse(event.body || '{}');

    if (!uid) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing uid' }) };

    if (action === 'delete') {
      await admin.auth().deleteUser(uid);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'User deleted from Firebase Auth' }) };
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
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

export { handler };

