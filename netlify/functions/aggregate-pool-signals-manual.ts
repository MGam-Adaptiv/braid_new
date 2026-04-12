import { Handler } from '@netlify/functions';
import { runAggregation } from './utils/aggregationLogic';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  const adminKey = event.headers['x-admin-key'];
  if (!process.env.ADMIN_SECRET || adminKey !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const result = await runAggregation();
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err: any) {
    console.error('[aggregate-manual] error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

export { handler };
