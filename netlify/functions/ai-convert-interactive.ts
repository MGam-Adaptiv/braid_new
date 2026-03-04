import { Handler } from '@netlify/functions';
import { Mistral } from '@mistralai/mistralai';

interface RequestBody {
  studentContent: string;
  answerKey: string;
  activityType?: string;
  level?: string;
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

    const { studentContent, answerKey, activityType, level } = JSON.parse(event.body) as RequestBody;

    if (!studentContent) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing studentContent' }),
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

    const systemPrompt = `You are an expert educational content converter.
Your task is to convert a raw student worksheet text and its answer key into a structured interactive quiz JSON format.

CRITICAL: The JSON values must contain absolutely NO markdown symbols. No asterisks, no hashes, no backticks, no underscores used for emphasis. Strip all formatting — output plain text only in every field.

OUTPUT SCHEMA:
{
  "activityType": "string (e.g., 'Multiple Choice', 'Fill in the Blanks', 'Matching', 'True/False', 'Mixed')",
  "instructions": "string (The main instruction for the student)",
  "questions": [
    {
      "id": number,
      "type": "multiple-choice" | "fill-blank" | "true-false" | "matching" | "ordering" | "open-ended" | "multi-select",
      "question": "string (The question text, stripped of numbering like '1.')",
      "options": ["string"] (Array of choices for MC/Multi-select. Empty for others.),
      "correctAnswer": "string" | ["string"] | null (The correct answer(s). For matching, null.),
      "hint": "string" | null (Any parenthetical hint found in the text, e.g., '(verb)'),
      "pairs": [{"left": "string", "right": "string"}] (Only for 'matching' type. The correct pairs.)
    }
  ],
  "wordBank": ["string"] (If a word bank is present in the text, extract it here. Otherwise empty.),
  "timeLimit": null
}

RULES:
1. STRIP MARKDOWN: Remove all bold (**), italic (*), and other markdown symbols from the text.
2. DETECT TYPES: Infer the question type based on the content (e.g., if there are A/B/C options, it's multiple-choice).
3. HINTS: If a question has a hint in parentheses like "The cat ___ (run) fast", extract "run" as the hint and remove it from the question text if it makes sense, or keep it if it's part of the sentence structure. Ideally, "The cat ___ fast" with hint "run".
4. IGNORE EXTRAS: Ignore sections labeled "Bonus", "Extension", "Teacher Notes", or "Optional".
5. MAP ANSWERS: Use the provided Answer Key to populate 'correctAnswer'. Match by question number or position. If no answer key is provided, try to infer or leave null.
6. MATCHING: For matching questions, create 'pairs' in the question object.
7. VALID JSON: Return ONLY the raw JSON object. No markdown code blocks, no introductory text.
8. CRITICAL: The correctAnswer field MUST contain the actual answer text, NEVER an option letter. If options are ['an', 'a', 'the'] and the correct answer is 'an', set correctAnswer to 'an' NOT 'A' or 'A. an'. Strip all letter prefixes from options too — store only clean text like 'an' not 'A. an'.
`;

    const userPrompt = `
Activity Type: ${activityType || 'Unknown'}
Level: ${level || 'Unknown'}

---STUDENT CONTENT---
${studentContent}

---ANSWER KEY---
${answerKey}
`;

    const chatResponse = await client.chat.complete({
      model: 'mistral-medium-latest',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.1, // Low temperature for deterministic JSON output
      responseFormat: { type: 'json_object' },
    });

    const content = chatResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Mistral');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(content);

      // Post-processing: Strip option prefixes from options and correctAnswer
      if (parsedResult.questions && Array.isArray(parsedResult.questions)) {
        parsedResult.questions.forEach((q: any) => {
          const prefixRegex = /^[A-Da-d][\.\)]\s*/;
          
          // Clean options
          if (q.options && Array.isArray(q.options)) {
            q.options = q.options.map((opt: string) => opt.replace(prefixRegex, ''));
          }
          
          // Clean correctAnswer and map letters to text if needed
          if (typeof q.correctAnswer === 'string') {
             // 1. Strip prefix
             let cleanAns = q.correctAnswer.replace(prefixRegex, '');
             
             // 2. Check if it matches an option
             const match = q.options?.find((opt: string) => opt.toLowerCase() === cleanAns.toLowerCase());
             
             if (!match) {
                // 3. If no match, check if it's a single letter A-D
                const letterMatch = cleanAns.match(/^[A-Da-d]$/);
                if (letterMatch && q.options && q.options.length > 0) {
                   const index = letterMatch[0].toUpperCase().charCodeAt(0) - 65; // A=0, B=1...
                   if (index >= 0 && index < q.options.length) {
                      cleanAns = q.options[index];
                   }
                }
             }
             q.correctAnswer = cleanAns;

          } else if (Array.isArray(q.correctAnswer)) {
             q.correctAnswer = q.correctAnswer.map((ans: string) => {
                let cleanAns = ans.replace(prefixRegex, '');
                const match = q.options?.find((opt: string) => opt.toLowerCase() === cleanAns.toLowerCase());
                if (!match) {
                    const letterMatch = cleanAns.match(/^[A-Da-d]$/);
                    if (letterMatch && q.options && q.options.length > 0) {
                       const index = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
                       if (index >= 0 && index < q.options.length) {
                          cleanAns = q.options[index];
                       }
                    }
                }
                return cleanAns;
             });
          }
        });
      }
    } catch (e) {
      console.error('Failed to parse Mistral response as JSON:', content);
      throw new Error('Invalid JSON response from AI');
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
      body: JSON.stringify({ result: parsedResult, tokensUsed }),
    };

  } catch (error: any) {
    console.error('Conversion failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "The conversion failed. Please try again." }),
    };
  }
};

export { handler };
