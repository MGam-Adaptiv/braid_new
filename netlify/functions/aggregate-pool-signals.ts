import { schedule, Handler } from '@netlify/functions';
import { runAggregation } from './utils/aggregationLogic';

const inner: Handler = async (_event) => {
  console.log('[aggregate-pool-signals] Daily run started');
  try {
    const result = await runAggregation();
    console.log('[aggregate-pool-signals] Done:', result);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err: any) {
    console.error('[aggregate-pool-signals] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

const handler = schedule('@daily', inner);
export { handler };
