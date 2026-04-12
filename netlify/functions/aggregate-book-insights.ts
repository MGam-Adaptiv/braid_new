import { schedule, Handler } from '@netlify/functions';
import { runBookAggregation } from './utils/bookAggregationLogic';

const inner: Handler = async (_event) => {
  console.log('[aggregate-book-insights] Daily run started');
  try {
    const result = await runBookAggregation();
    console.log('[aggregate-book-insights] Done:', result);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err: any) {
    console.error('[aggregate-book-insights] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

const handler = schedule('@daily', inner);
export { handler };
