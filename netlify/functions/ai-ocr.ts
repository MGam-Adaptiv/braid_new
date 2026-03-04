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
              text: `Perform high-fidelity OCR on this educational material.
Identify and extract all text content while preserving the logical structure.
Categorize text segments into paragraphs, headings, lists, or tables.

Return ONLY valid JSON:
{
  "fullText": "string containing all extracted text",
  "blocks": [
    {
      "text": "segment text",
      "type": "paragraph | heading | list | table",
      "confidence": 0.95
    }
  ],
  "confidence": 0.9,
  "language": "en"
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

    let jsonResponse;
    try {
        jsonResponse = JSON.parse(content as string);
    } catch (e) {
        console.error("Failed to parse JSON from Mistral response:", content);
        throw new Error("Invalid JSON response from AI model");
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
      body: JSON.stringify({ ...jsonResponse, tokensUsed }),
    };

  } catch (error: any) {
    console.error('OCR extraction failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'OCR extraction failed', 
        details: error.message,
        fallback: {
            fullText: "",
            blocks: [],
            confidence: 0,
            language: "unknown"
        }
      }),
    };
  }
};

export { handler };
