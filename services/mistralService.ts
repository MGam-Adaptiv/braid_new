import { SourceMaterial, WorkbenchItem, InteractiveData } from "../types";

export interface ExtractionResult {
  vocabulary?: { items: string[] };
  grammar?: { points: string[] };
  topic?: string;
  estimatedLevel?: string;
  readingText?: { content: string; present: boolean; confidence: string; type: string };
  error?: boolean;
}

const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const parts = result.split(',');
      resolve(parts.length > 1 ? parts[1] : parts[0]);
    };
    reader.readAsDataURL(blob);
  });
};

const cleanAnalysis = (rawResult: ExtractionResult): ExtractionResult => {
  const bannedWords = new Set(['match', 'circle', 'read', 'write', 'look', 'find', 'choose', 'listen', 'complete', 'underline', 'something', 'someone', 'near', 'far']);

  if (rawResult.vocabulary?.items) {
    const seen = new Set();
    rawResult.vocabulary.items = rawResult.vocabulary.items
      .map((v: string) => v.toLowerCase().trim())
      .filter((v: string) => {
        if (!v || bannedWords.has(v) || seen.has(v)) return false;
        seen.add(v);
        return true;
      });
  }

  if (rawResult.grammar?.points) {
    const seen = new Set();
    rawResult.grammar.points = rawResult.grammar.points.filter((g: string) => {
      const key = g.toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return rawResult;
};

/**
 * Extract educational metadata from a page image using Mistral Vision via Netlify Function.
 */
export const readPage = async (blobUrl: string): Promise<ExtractionResult> => {
  try {
    const base64Data = await blobUrlToBase64(blobUrl);

    const response = await fetch('/.netlify/functions/ai-read-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data,
        mimeType: 'image/png',
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed with status: ${response.status}`);
    }

    const rawResult = await response.json();
    return cleanAnalysis(rawResult);

  } catch (error) {
    console.error("Error reading page:", error);
    return { error: true };
  }
};

/**
 * Generate a new draft activity based on sources and user input using Mistral via Netlify Function.
 */
export const draftResponse = async (
  type: string,
  partnerInput: string,
  sources: SourceMaterial[],
  currentWorkbench: WorkbenchItem[],
  userId: string,
  userEmail: string | null,
  activityConfig?: { questionCount: number; questionFormat: string }
): Promise<string> => {
  try {
    const sourceContext = sources.map((s, i) => {
      try {
        const data = JSON.parse(s.content);
        if (s.type === 'multi-page') {
          const unitTags = data.allTags?.unitTags || [];
          const labelTags = data.allTags?.labelTags || [];
          return `[Unified Source: ${s.title}]
Book: ${data.allTags?.bookTitle || ''}
Publisher: ${data.allTags?.publisher || ''}
Units/Pages: ${unitTags.join(', ')}
Content Labels: ${labelTags.join(', ')}
Vocabulary Pool: ${data.vocabulary?.join(', ') || ''}
Grammar Pool: ${data.grammar?.join(', ') || ''}
Topic Summary: ${data.topic || ''}
Level: ${data.level || ''}
Text Pool: ${(data.ocrTexts || []).join('\n\n')}`;
        }
        return `[Source: ${s.title}] ${s.content}`;
      } catch (e) {
        return `[Source: ${s.title}] ${s.content}`;
      }
    }).join('\n\n');

    const workbenchContext = currentWorkbench.map(w => `[Item: ${w.title}] ${w.content}`).join('\n\n');

    const prompt = type === 'Custom'
      ? partnerInput
      : `Draft a ${type} activity. Teacher instructions: ${partnerInput || 'Use the source material to create an appropriate activity.'}${activityConfig ? ` Format: ${activityConfig.questionFormat}, Questions: ${activityConfig.questionCount}` : ''}`;

    const response = await fetch('/.netlify/functions/ai-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sourceContext, workbenchContext })
    });

    if (!response.ok) throw new Error(`Drafting failed: ${response.status}`);
    const data = await response.json();
    return data.result || "The drafting partner encountered an error. Please try again.";
  } catch (error) {
    console.error("Draft generation error:", error);
    return "The drafting partner encountered an error. Please try again.";
  }
};

export const refineDraft = async (
  currentDraft: string,
  refinementRequest: string,
  sources: SourceMaterial[],
  userId: string,
  userEmail: string | null
): Promise<string> => {
  const sourceContext = sources.map(s => {
    try {
      const data = JSON.parse(s.content);
      if (s.type === 'multi-page') {
        return `[Source: ${s.title}] Vocab: ${data.vocabulary?.join(', ') || ''}, Grammar: ${data.grammar?.join(', ') || ''}, Level: ${data.level || 'B1'}`;
      }
      return `[Source: ${s.title}] ${s.content}`;
    } catch (e) {
      return `[Source: ${s.title}] ${s.content}`;
    }
  }).join('\n\n');

  try {
    const response = await fetch('/.netlify/functions/ai-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `The teacher wants to REFINE this draft:\n\n${currentDraft}\n\nRefinement request: "${refinementRequest}"\n\nUpdate the draft accordingly. Keep the ---TITLE--- / ---TEACHER NOTES--- / ---STUDENT CONTENT--- / ---ANSWER KEY--- / ---END--- structure.`,
        sourceContext,
        workbenchContext: ''
      })
    });

    if (!response.ok) throw new Error(`Refine failed: ${response.status}`);
    const data = await response.json();
    return data.result || "The drafting partner encountered an error. Please try again.";
  } catch (error) {
    console.error("Refine Draft Error:", error);
    return "The drafting partner encountered an error. Please try again.";
  }
};

/**
 * Convert student content and answer key to interactive quiz JSON using Mistral via Netlify Function.
 */
export const convertToInteractive = async (
  studentContent: string,
  answerKey: string,
  activityType?: string,
  level?: string
): Promise<InteractiveData | null> => {
  try {
    const response = await fetch('/.netlify/functions/ai-convert-interactive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentContent, answerKey, activityType, level })
    });

    if (!response.ok) {
      throw new Error(`Conversion failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result as InteractiveData;
  } catch (error) {
    console.error("Interactive conversion error:", error);
    return null;
  }
};
