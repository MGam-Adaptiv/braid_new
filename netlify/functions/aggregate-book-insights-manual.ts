import { Handler } from '@netlify/functions';
import { runBookAggregation } from './utils/bookAggregationLogic';

const headers = {
  'Access-Control-Allow-Origin': 'https://braid.studio',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  const adminKey = event.headers['x-admin-key'];
  if (!process.env.ADMIN_SECRET || adminKey !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const result = await runBookAggregation();
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err: any) {
    console.error('[aggregate-book-insights-manual] error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'An internal error occurred. Please try again.' }) };
  }
};

export { handler };
