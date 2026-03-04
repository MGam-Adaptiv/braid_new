import { Handler } from '@netlify/functions';
import { Mistral } from '@mistralai/mistralai';

interface RequestBody {
  prompt: string;
  sourceContext: string;
  workbenchContext: string;
}

const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    if (!event.body) {
      throw new Error('Missing request body');
    }

    const { prompt, sourceContext, workbenchContext } = JSON.parse(event.body) as RequestBody;

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing prompt' }),
      };
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      console.error('MISTRAL_API_KEY is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const client = new Mistral({ apiKey });

    const chatResponse = await client.chat.complete({
      model: 'mistral-medium-latest',
      messages: [
        {
          role: 'system',
          content: `You are a professional teacher's Drafting Partner for BraidStudio.
Your core philosophy is "Human in the loop".
You provide drafts based on analyzed materials.
NEVER say "generate". ALWAYS say "draft".
Keep your tone warm, approachable, and respectful.

CRITICAL: You MUST output in this EXACT structure with these EXACT markers:

---TITLE---
[Activity title]

---TEACHER NOTES---
[2-3 sentences explanation for the teacher only]

---STUDENT CONTENT---
[The actual activity for students. Clean, direct instructions.]

---ANSWER KEY---
[The solutions]

---END---`,
        },
        {
          role: 'user',
          content: `Context:\n${sourceContext || 'No source context provided.'}\n\nWorkbench:\n${workbenchContext || 'No workbench context provided.'}\n\nUser Request: ${prompt}`,
        },
      ],
      temperature: 0.7,
    });

    const content = chatResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Mistral');
    }

    const usage = chatResponse.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const tokensUsed = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens || (usage.promptTokens + usage.completionTokens)
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: content, tokensUsed }),
    };

  } catch (error: any) {
    console.error('Drafting failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ result: "The drafting partner encountered an error. Please try again." }),
    };
  }
};

export { handler };
