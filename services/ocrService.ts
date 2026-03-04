import { trackTokenUsage } from './tokenService';

export interface OCRResult {
  fullText: string;
}

/**
 * extractTextFromImage: Extracts readable text from educational materials provided as base64 images.
 * Uses Mistral Vision via Netlify Function.
 */
export const extractTextFromImage = async (base64Image: string, userId: string): Promise<OCRResult> => {
  try {
    const response = await fetch('/.netlify/functions/ai-ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data: base64Image,
        mimeType: 'image/jpeg',
      }),
    });

    if (!response.ok) {
      throw new Error(`OCR failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.tokensUsed) {
      await trackTokenUsage(userId, data.tokensUsed.totalTokens, 'ocr');
    }

    return { fullText: data.fullText || '' };

  } catch (error) {
    console.error("OCR Failed:", error);
    return { fullText: "Failed to extract text from the provided image." };
  }
};
