import firebase from 'firebase/compat/app';
import { db } from '../lib/firebase';

// EUR cost per token — update these if Mistral changes pricing
export const MISTRAL_PRICING: Record<string, { input: number; output: number }> = {
  'mistral-small-latest':  { input: 0.09  / 1_000_000, output: 0.28 / 1_000_000 },
  'mistral-medium-latest': { input: 0.40  / 1_000_000, output: 2.00 / 1_000_000 },
};

export interface TokenUsagePayload {
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
  model?: string;
}

export const trackTokenUsage = async (
  userId: string,
  tokensUsed: TokenUsagePayload,
  operation: string
): Promise<void> => {
  if (!userId) return;

  const inputTokens  = tokensUsed.promptTokens    || 0;
  const outputTokens = tokensUsed.completionTokens || 0;
  const totalTokens  = tokensUsed.totalTokens      || (inputTokens + outputTokens);
  if (!totalTokens) return;

  const model    = tokensUsed.model || 'mistral-small-latest';
  const pricing  = MISTRAL_PRICING[model] || MISTRAL_PRICING['mistral-small-latest'];
  const costEUR  = (inputTokens * pricing.input) + (outputTokens * pricing.output);
  const month    = new Date().toISOString().substring(0, 7); // 'YYYY-MM'

  try {
    const batch = db.batch();

    // 1. Increment totalTokensUsed on user document (existing behaviour, kept for compatibility)
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      totalTokensUsed: firebase.firestore.FieldValue.increment(totalTokens),
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Platform-wide tokenUsage collection — one doc per API call, queryable by admin
    const usageRef = db.collection('tokenUsage').doc();
    batch.set(usageRef, {
      userId,
      operation,   // 'ocr' | 'extraction' | 'drafting' | 'enhance' | 'conversion' | 'action-plan'
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      costEUR,
      month,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    // Non-blocking — never interrupt the main app flow
    console.error('Failed to track token usage:', error);
  }
};
