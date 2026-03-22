import { Handler } from '@netlify/functions';
import { Mistral } from '@mistralai/mistralai';
import { checkRateLimit, getClientIp } from './utils/rateLimiter';

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
      model: 'mistral-small-latest',
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
[A SHORT, UNIQUE plain-text title — ABSOLUTELY NO markdown, asterisks, bold, or surrounding quotes. The title MUST name the SPECIFIC grammar point or vocabulary set being practised, e.g. "Modal Verbs Can & Can't — Abilities Interview" or "Unit 3 Food Vocabulary: Quantities Matching". Never use vague titles like "Speaking Activity" or "Grammar Practice". Each activity for the same book must have a distinctly different title.]

---TEACHER NOTES---
[2-3 sentences explanation for the teacher only]

---STUDENT CONTENT---
[The actual activity for students. Clean, direct instructions. No markdown formatting.]

---ANSWER KEY---
[The solutions. For speaking/writing activities write: N/A — Speaking/Writing activity: sample model answers for teacher reference, then provide 3-4 model answers.]

---INTERACTIVE DATA---
[Output a single valid JSON object. NO markdown fences, NO code blocks — raw JSON only. Schema:
{
  "activityType": "string (e.g. Gap Fill, Error Correction, Multiple Choice, True/False, Matching, Speaking Cards, Open Questions)",
  "instructions": "string — plain text instruction for students, no markdown symbols",
  "questions": [
    {
      "id": 1,
      "type": "fill-blank | multiple-choice | true-false | matching | open-ended",
      "question": "string — see type rules below",
      "options": [],
      "correctAnswer": "string | null",
      "hint": "string | null",
      "pairs": null
    }
  ],
  "wordBank": []
}

TYPE RULES — follow exactly:

fill-blank: "question" = the COMPLETE SENTENCE with ___ where the blank is. Example: "She ___ been waiting for an hour." NEVER write "Gap 1", "Blank 2", or any placeholder label. If the student content has a passage with numbered gaps like (1), (2), find and include the full sentence containing that gap. "correctAnswer" = exact word/phrase. "options" = [] unless word bank exists (then list word bank items in top-level wordBank array). "hint" = verb hint in parentheses if present, else null. "pairs" = null. CRITICAL: Each fill-blank question object must have EXACTLY ONE ___ blank. If a sentence has two gaps, create two separate question objects — one per blank. Never put two ___ in a single question string.

multiple-choice: "question" = question text. "options" = array of 3-4 answer strings (no letter prefixes like A. B. — just the text). "correctAnswer" = the exact text of the correct option (not a letter). "hint" = null. "pairs" = null.

true-false: "question" = the statement. "options" = ["True", "False"]. "correctAnswer" = "True" or "False". "hint" = null. "pairs" = null.

matching: "question" = "Match the items." or similar brief instruction. "options" = []. "correctAnswer" = null. "hint" = null. "pairs" = [{"left": "term", "right": "definition or match"}].

open-ended: "question" = the question text. "options" = []. "correctAnswer" = null. "hint" = null. "pairs" = null.

FOR SPEAKING/WRITING ACTIVITIES: Output {"activityType": "Speaking", "instructions": "Use the prompts below for discussion.", "questions": [], "wordBank": []}

CRITICAL: Every fill-blank question MUST contain a real, complete sentence with exactly one ___. Never use generic labels.]

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
      totalTokens: usage.totalTokens || (usage.promptTokens + usage.completionTokens),
      model: 'mistral-small-latest'
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

