import { SourceMaterial, WorkbenchItem, InteractiveData } from "../types";
import { trackTokenUsage } from './tokenService';

export interface ExtractionResult {
  targetVocabulary?: { items: string[] };
  contextVocabulary?: { items: string[] };
  vocabulary?: { items: string[] }; // legacy fallback
  grammar?: { points: string[] };
  topic?: string;
  estimatedLevel?: string;
  readingText?: { content: string; present: boolean; confidence: string; type: string };
  pageNumber?: number | null;
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

const cleanVocabItems = (items: string[]): string[] => {
  const bannedWords = new Set(['match', 'circle', 'read', 'write', 'look', 'find', 'choose', 'listen', 'complete', 'underline', 'something', 'someone', 'near', 'far']);
  const seen = new Set<string>();
  return items
    .map((v: string) => v.toLowerCase().trim())
    .filter((v: string) => {
      if (!v || bannedWords.has(v) || seen.has(v)) return false;
      seen.add(v);
      return true;
    });
};

const cleanAnalysis = (rawResult: ExtractionResult): ExtractionResult => {
  if (rawResult.targetVocabulary?.items) {
    rawResult.targetVocabulary.items = cleanVocabItems(rawResult.targetVocabulary.items);
  }
  if (rawResult.contextVocabulary?.items) {
    rawResult.contextVocabulary.items = cleanVocabItems(rawResult.contextVocabulary.items);
  }
  if (rawResult.vocabulary?.items) {
    rawResult.vocabulary.items = cleanVocabItems(rawResult.vocabulary.items);
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
export const readPage = async (blobUrl: string, userId: string): Promise<ExtractionResult> => {
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
      let errBody = '';
      try { errBody = await response.text(); } catch (_) {}
      console.error(`[readPage] HTTP ${response.status} from ai-read-page. Body:`, errBody);
      throw new Error(`Analysis failed with status: ${response.status} — ${errBody}`);
    }

    const rawResult = await response.json();

    if (rawResult.tokensUsed) {
      await trackTokenUsage(userId, rawResult.tokensUsed, 'extraction');
    }

    return cleanAnalysis(rawResult);

  } catch (error: any) {
    console.error("[readPage] Scan failed:", error?.message || error);
    // Surface the URL being called so it's easy to spot routing issues
    console.error("[readPage] Target URL: /.netlify/functions/ai-read-page (resolved from", window.location.origin, ")");
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
  activityConfig?: { questionCount: number; questionFormat: string },
  activityTypeMeta?: { templateInstruction: string; typeId: string; typeName: string; format: string; category: string },
  excludedPoolItems?: string[],
  cefrLevel?: string,
  poolPrefsHints?: { preferredActivityTypes?: string[]; cefrCalibrationHint?: string }
): Promise<{ content: string; narration: any | null }> => {
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

    // If an activity type template is selected, prepend ACTIVITY SPECIFICATION
    const typeSpec = activityTypeMeta?.templateInstruction
      ? `ACTIVITY SPECIFICATION: ${activityTypeMeta.templateInstruction}\n\n`
      : '';

    const excludedNote = excludedPoolItems?.length
      ? `\n\nEXCLUDED POOL ITEMS — do NOT use these in the activity: ${excludedPoolItems.join(', ')}`
      : '';

    const prompt = typeSpec + (type === 'Custom'
      ? partnerInput + excludedNote
      : `Draft a ${type} activity. Teacher instructions: ${partnerInput || 'Use the source material to create an appropriate activity.'}${activityConfig ? ` Format: ${activityConfig.questionFormat}, Questions: ${activityConfig.questionCount}` : ''}${excludedNote}`);

    const response = await fetch('/.netlify/functions/ai-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sourceContext, workbenchContext, exerciseCount: activityConfig?.questionCount, cefrLevel, preferredActivityTypes: poolPrefsHints?.preferredActivityTypes, cefrCalibrationHint: poolPrefsHints?.cefrCalibrationHint })
    });

    if (!response.ok) throw new Error(`Drafting failed: ${response.status}`);
    const data = await response.json();
    
    if (data.tokensUsed) {
      await trackTokenUsage(userId, data.tokensUsed, 'drafting');
    }

    return {
      content: data.result || "The drafting partner encountered an error. Please try again.",
      narration: data.narration || null,
    };
  } catch (error) {
    console.error("Draft generation error:", error);
    return { content: "The drafting partner encountered an error. Please try again.", narration: null };
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
    
    if (data.tokensUsed) {
      await trackTokenUsage(userId, data.tokensUsed, 'drafting');
    }

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
  userId: string,
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
    
    if (data.tokensUsed) {
      await trackTokenUsage(userId, data.tokensUsed, 'conversion');
    }

    return data.result as InteractiveData;
  } catch (error) {
    console.error("Interactive conversion error:", error);
    return null;
  }
};


