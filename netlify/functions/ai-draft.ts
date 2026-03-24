import { Handler } from '@netlify/functions';
import { Mistral } from '@mistralai/mistralai';
import { checkRateLimit, getClientIp } from './utils/rateLimiter';

interface RequestBody {
  prompt: string;
  sourceContext: string;
  workbenchContext: string;
  exerciseCount?: number;
  cefrLevel?: string;
  excludedItems?: string[];
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

    const { prompt, sourceContext, workbenchContext, exerciseCount, cefrLevel, excludedItems } = JSON.parse(event.body) as RequestBody;

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

    console.log('EXCLUDED ITEMS:', JSON.stringify(excludedItems));
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

TEACHER NOTES LEVEL RULE: In the ---TEACHER NOTES--- section, you MUST state exactly the teacher-selected CEFR level provided in the request. Never infer a different level. Never change it. Use it exactly as given.

CRITICAL: You MUST output in this EXACT structure with these EXACT markers:

---NARRATION---
[Output raw JSON only — no markdown fences. Schema: {"activityType": "string e.g. Gap Fill", "cefrLevel": "string e.g. B1", "itemsSelected": ["word1", "word2"], "itemsSkipped": ["word3"], "skipReason": "one short phrase explaining why items were skipped, e.g. low frequency for this level"}. List every vocabulary/grammar item from the source pool. itemsSelected = items you used in the activity. itemsSkipped = items from the pool you did not use. If nothing was skipped, use []. If no pool exists, itemsSelected = [] and itemsSkipped = [].]

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

fill-blank: "question" = the COMPLETE SENTENCE with ___ where the blank is. The blank marker is ALWAYS exactly ___ (three underscores — no more, no fewer). Example: "She ___ been waiting for an hour." NEVER write "Gap 1", "Blank 2", or any placeholder label. If the student content has a passage with numbered gaps like (1), (2), find and include the full sentence containing that gap. "correctAnswer" = exact word/phrase. "options" = [] unless word bank exists (then list word bank items in top-level wordBank array). "hint" = verb hint in parentheses if present, else null. "pairs" = null. ABSOLUTE RULE — ONE BLANK PER QUESTION: Every question object must contain EXACTLY ONE blank (___). Count the blanks in every sentence before finalising. If a sentence needs two different words, you MUST split it into two separate question objects — one sentence per question, one blank per question. A sentence with two ___ is a critical error — this will break the student interface. Never do this under any circumstances.

multiple-choice: "question" = question text. "options" = array of 3-4 answer strings (no letter prefixes like A. B. — just the text). "correctAnswer" = the exact text of the correct option (not a letter). "hint" = null. "pairs" = null.

true-false: "question" = the statement. "options" = ["True", "False"]. "correctAnswer" = "True" or "False". "hint" = null. "pairs" = null.

matching: "question" = "Match the items." or similar brief instruction. "options" = []. "correctAnswer" = null. "hint" = null. "pairs" = [{"left": "term", "right": "definition or match"}].

open-ended: "question" = the question text. "options" = []. "correctAnswer" = null. "hint" = null. "pairs" = null.

FOR SPEAKING/WRITING ACTIVITIES: Output {"activityType": "Speaking", "instructions": "Use the prompts below for discussion.", "questions": [], "wordBank": []}

ABSOLUTE RULE — ONE BLANK PER QUESTION: Every fill-blank question MUST contain a real, complete sentence with EXACTLY ONE ___ (three underscores). Count the blanks in EVERY sentence before finalising — do not skip this check. If a sentence needs two different words, you MUST split it into two separate question objects — one per blank, each with its own correctAnswer. A sentence with two ___ is a critical error that breaks the student interface. Never produce this under any circumstances. The blank marker is always exactly ___ — never __ (two underscores), never ____ (four), always exactly three.]

---END---`,
        },
        {
          role: 'user',
          content: `${cefrLevel ? `Teacher-selected CEFR level: ${cefrLevel}. IMPORTANT — In the ---TEACHER NOTES--- section, always use exactly this level: ${cefrLevel}. Never infer a different level.\n\n` : ''}${exerciseCount ? `Generate exactly ${exerciseCount} exercises/questions. Do not generate more or fewer.\n\n` : ''}${excludedItems && excludedItems.length > 0 ? `NEVER use these vocabulary or grammar items anywhere in the activity — not in sentences, not in the word bank, not in examples: ${excludedItems.join(', ')}. This is a hard rule.\n\n` : ''}Context:\n${sourceContext || 'No source context provided.'}\n\nWorkbench:\n${workbenchContext || 'No workbench context provided.'}\n\nUser Request: ${prompt}`,
        },
      ],
      temperature: 0.7,
    });

    const content = chatResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Mistral');
    }

    // Extract ---NARRATION--- block and strip it from the content returned to the client
    let narration: any = null;
    let cleanedContent = content;
    const narrationMatch = content.match(/---NARRATION---\s*([\s\S]*?)---TITLE---/);
    if (narrationMatch) {
      try {
        narration = JSON.parse(narrationMatch[1].trim());
      } catch (_) {
        // narration JSON malformed — silently ignore, narration stays null
      }
      cleanedContent = content.replace(/---NARRATION---[\s\S]*?---TITLE---/, '---TITLE---');
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
      body: JSON.stringify({ result: cleanedContent, narration, tokensUsed }),
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

