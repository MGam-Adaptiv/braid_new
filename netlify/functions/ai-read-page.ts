import { Handler } from '@netlify/functions';
import { Mistral } from '@mistralai/mistralai';

interface RequestBody {
  base64Data: string;
  mimeType: string;
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

    const { base64Data, mimeType } = JSON.parse(event.body) as RequestBody;

    if (!base64Data || !mimeType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing base64Data or mimeType' }),
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
      model: 'mistral-small-latest',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              imageUrl: `data:${mimeType};base64,${base64Data}`,
            },
            {
              type: 'text',
              text: `You are an expert ELT (English Language Teaching) coursebook analyst. Read this page thoroughly to identify target language.

VOCABULARY:
List useful words and phrases found (20-40 items). Include Daily routine phrases, Sport collocations, Time expressions, verbs, etc.

GRAMMAR:
Identify target grammar points (e.g., "Present Simple", "Prepositions of time").

CEFR LEVEL DETECTION:
Estimate the CEFR level (A1, A2, B1, B2, C1, C2) based on vocabulary complexity, grammar structures, and text length.

TOPIC:
Identify the communicative theme.

Return ONLY valid JSON:
{
  "vocabulary": { "items": ["..."], "count": 30, "confidence": "high" },
  "grammar": { "points": ["..."], "count": 2, "confidence": "high" },
  "readingText": { "content": "passage text", "present": true, "title": "Heading", "confidence": "high" },
  "topic": "...",
  "estimatedLevel": "B1",
  "levelConfidence": "high",
  "levelReasoning": "Brief explanation of level choice",
  "pageType": "mixed"
}`,
            },
          ],
        },
      ],
      responseFormat: { type: 'json_object' },
    });

    const content = chatResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Mistral');
    }

    // Ensure the content is valid JSON before returning
    let jsonResponse;
    try {
        // Sometimes the model might wrap the JSON in markdown code blocks, although response_format should prevent it.
        // Just in case, we can try to clean it or parse it directly.
        // Since we asked for JSON object, it should be clean JSON.
        jsonResponse = JSON.parse(content as string);
    } catch (e) {
        console.error("Failed to parse JSON from Mistral response:", content);
        throw new Error("Invalid JSON response from AI model");
    }

    const usage = chatResponse.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const tokensUsed = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens || (usage.promptTokens + usage.completionTokens),
      model: 'mistral-small-latest'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...jsonResponse, tokensUsed }),
    };

  } catch (error: any) {
    console.error('Analysis failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Analysis failed', details: error.message }),
    };
  }
};

export { handler };
