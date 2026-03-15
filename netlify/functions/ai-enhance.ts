import { Handler } from '@netlify/functions';
import { Mistral } from '@mistralai/mistralai';
import { checkRateLimit, getClientIp } from './utils/rateLimiter';

interface RequestBody {
  enhancementType: string;
  studentContent: string;
  activityType?: string;
  level?: string;
}

const ENHANCEMENT_PROMPTS: Record<string, string> = {
  simplify: `You are an EFL/ESL expert. Simplify the student activity content below.
- Reduce vocabulary to a lower CEFR band
- Shorten and simplify sentence structures
- Keep the same learning objective and task format
- Do NOT change the activity type or add new sections`,

  increase_difficulty: `You are an EFL/ESL expert. Increase the difficulty of the student activity content below.
- Use higher-level vocabulary
- Add more complex sentence structures and grammar
- Deepen the cognitive demand (e.g. analysis, inference, opinion)
- Do NOT change the activity type or add new sections`,

  add_scaffolding: `You are an EFL/ESL expert. Add scaffolding to the student activity content below.
- Add a word bank, sentence starters, or example answers where appropriate
- Add clear step-by-step instructions if missing
- Make support visible but optional (label it "Support Box" or similar)
- Do NOT change or remove any existing content`,

  add_lead_in: `You are an EFL/ESL expert. Add a lead-in (warmer) to the student activity content below.
- Write 2-3 short activating questions or a brief visual/discussion prompt BEFORE the main activity
- The lead-in must activate prior knowledge or interest in the topic
- Label it clearly: "Lead-In" or "Warm-Up"
- Keep the existing activity completely intact after the lead-in`,

  convert_pair_work: `You are an EFL/ESL expert. Rewrite the student activity content below for pair work.
- Rewrite instructions so Student A and Student B have complementary roles
- Add a brief "Share with your partner" or "Compare answers" step at the end
- Keep the same language focus and learning objective
- Label roles clearly if applicable`,

  localise_context: `You are an EFL/ESL expert. Localise the student activity content below.
- Replace foreign or culturally specific names, places, and references with neutral or locally relevant alternatives
- Keep the same grammar and vocabulary focus
- Do NOT change the activity structure or instructions
- Use common international names if a specific local context is unknown`,
};

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ip = getClientIp(event.headers);
  const { limited, headers: rlHeaders } = checkRateLimit(ip);
  if (limited) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rlHeaders },
      body: JSON.stringify({ error: 'Too many requests. Please wait a minute.' }),
    };
  }

  try {
    const { enhancementType, studentContent, activityType = '', level = 'B1' }: RequestBody = JSON.parse(event.body || '{}');

    if (!enhancementType || !studentContent) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'enhancementType and studentContent are required' }) };
    }

    const systemPrompt = ENHANCEMENT_PROMPTS[enhancementType];
    if (!systemPrompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown enhancement type: ${enhancementType}` }) };
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const client = new Mistral({ apiKey });

    const userMessage = `Activity Type: ${activityType || 'General'}
CEFR Level: ${level}

STUDENT CONTENT TO ENHANCE:
${studentContent}

Return ONLY the enhanced student content section. No titles, no teacher notes, no answer key. Just the improved student-facing content.`;

    const chatResponse = await client.chat.complete({
      model: 'mistral-medium-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.5,
    });

    const enhanced = chatResponse.choices?.[0]?.message?.content;
    if (!enhanced) throw new Error('No content received from Mistral');

    const usage = chatResponse.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const tokensUsed = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens || (usage.promptTokens + usage.completionTokens),
      model: 'mistral-medium-latest'
    };

    // Human-readable summary for the Build Log
    const summaryMap: Record<string, string> = {
      simplify: 'Simplified content',
      increase_difficulty: 'Increased difficulty',
      add_scaffolding: 'Added scaffolding (word banks / sentence starters)',
      add_lead_in: 'Added lead-in / warmer task',
      convert_pair_work: 'Converted to pair work',
      localise_context: 'Localised context and references',
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        enhanced,
        summary: summaryMap[enhancementType] || enhancementType,
        tokensUsed,
      }),
    };
  } catch (error: any) {
    console.error('Enhancement failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Enhancement failed. Please try again.' }),
    };
  }
};

export { handler };

