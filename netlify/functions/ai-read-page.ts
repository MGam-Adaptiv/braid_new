import { Handler } from '@netlify/functions';
import { Mistral } from '@mistralai/mistralai';
import { checkRateLimit, getClientIp } from './utils/rateLimiter';

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

VOCABULARY — TWO TIERS:

TIER 1 — TARGET VOCABULARY (Core, explicitly taught):
Words and phrases EXPLICITLY PRESENTED as new language on this page — appearing in vocabulary boxes, word lists, highlighted or bolded as new vocabulary, or labelled as "new words" / "key words". These are the words the lesson is specifically TEACHING. List 5–15 items maximum.
Do NOT include:
- Grammar terminology or tense names (e.g. "past perfect simple", "past participle", "present simple") — these belong in the Grammar section only
- Proper nouns — character names, people's names, place names, country names, brand names
- Dates, years (e.g. 1960s), or standalone numbers

TIER 2 — CONTEXT VOCABULARY (Incidental, from reading/exercises):
Words from reading texts, dialogues, listening scripts, or exercise content that students encounter but are NOT the main teaching focus. Do NOT include:
- Wrong-answer distractors from multiple choice exercises — only the correct answer options
- Pronouns (I, he, she, they, her, his, its, my, our, their, your), articles (a, an, the), or prepositions
- Exercise instruction words (match, complete, circle, tick, underline, look, listen, repeat, choose, write, answer, discuss, guess, find, label, describe, check, practise, review, remember, learn, study, read, say, ask, tell, think, work)
- Section headings or page labels (e.g. "Vocabulary", "Reading Text", "Word list", "Grammar", "Topic")
- Grammar terminology or tense names
- Proper nouns — character names, people's names, place names, country names, brand names
- Dates, years, or standalone numbers
List 5–20 items maximum.

GRAMMAR:
Identify target grammar points (e.g., "Present Simple", "Possessive Adjectives", "Prepositions of time").

CEFR LEVEL DETECTION:
Identify the CEFR level based strictly on the vocabulary and grammar structures visible on this page. Use the official Common European Framework of Reference (CEFR Companion Volume 2018) descriptors:

- Pre-A1 (Starter): Can use only isolated words and basic expressions to give simple information. Vocabulary: single words only, numbers 1-10, colours, basic classroom objects. Grammar: no structures yet — only memorised labels. Page is almost entirely picture-based with labelling exercises.
- A1 (Breakthrough): Has a very basic range of simple expressions about personal details and concrete needs. Vocabulary: basic repertoire of words and phrases related to particular concrete situations (family, body parts, colours, numbers, greetings, classroom objects, everyday items). Grammar: very limited control of a few simple structures — verb "to be", possessive adjectives (my/your/his/her), simple personal pronouns. Very short one-clause sentences. Can ask and answer questions about personal details.
- A2 (Waystage): Has a repertoire of basic language for everyday situations with predictable content. Vocabulary: sufficient for routine everyday transactions — daily routines, shopping, directions, food, transport, simple descriptions. Grammar: basic sentence patterns with memorised phrases — present simple, present continuous, past simple, there is/are, countable/uncountable nouns. Uses some simple structures correctly but makes basic mistakes.
- B1 (Threshold): Has sufficient vocabulary to express him/herself on most topics pertinent to everyday life. Vocabulary: family, hobbies, work, travel, current events with some circumlocutions. Grammar: present perfect, first conditional, comparatives/superlatives, basic phrasal verbs, modal verbs for obligation/possibility. Connected paragraphs with linking words. Can express opinions.
- B2 (Vantage): Has a good range of vocabulary for general topics. Vocabulary: abstract nouns, technical terminology of a field, formal and informal register. Grammar: passive voice, second conditional, reported speech, complex clauses, relative clauses. Argumentative and discursive texts.
- C1 (Effective Operational Proficiency): Has a good command of a broad lexical repertoire. Vocabulary: idiomatic expressions, colloquialisms, nuanced language. Grammar: complex grammar (mixed conditionals, subjunctive), implicit meaning, academic or professional register.
- C2 (Mastery): Has a good command of a very broad lexical repertoire including idiomatic expressions; maintains consistent grammatical control of complex language. Literary or highly technical text.

Base your level decision strictly on what grammar and vocabulary is actually present on the page — do not guess or default.

TOPIC:
Identify the communicative theme.

PAGE NUMBER:
Read the page number printed on the page (usually bottom-left, bottom-right, or top corner). Return the integer only. Return null if not visible or if this is a cover/intro page with no number.

Return ONLY valid JSON:
{
  "targetVocabulary": { "items": ["..."], "count": 8 },
  "contextVocabulary": { "items": ["..."], "count": 12 },
  "grammar": { "points": ["..."], "count": 2, "confidence": "high" },
  "readingText": { "content": "passage text", "present": true, "title": "Heading", "confidence": "high" },
  "topic": "...",
  "estimatedLevel": "A1",
  "levelConfidence": "high",
  "levelReasoning": "Brief explanation of level choice based on grammar and vocabulary observed",
  "pageType": "mixed",
  "pageNumber": 34
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

