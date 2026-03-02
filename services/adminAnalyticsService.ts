import { db } from '../lib/firebase';
import { ContentAsset, Activity } from '../types';
import { GoogleGenAI } from "@google/genai";

export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  cachedTokens: number;
  costEstimate: number;
}

export interface IntelligenceReport {
  observation: string;
  evidence: string;
  recommendation: string;
  usage?: TokenUsage;
}

export interface PulseMetrics {
  totalPings24h: number;
  topBook: string;
  topGrammar: string;
}

export interface FeedItem {
  id: string;
  bookTitle: string;
  pages: string;
  remixScore: number;
  engagement: number;
  timestamp: number;
  publisher: string;
}

export interface LanguageTrend {
  item: string;
  count: number;
  type: 'vocabulary' | 'grammar';
}

const getMillis = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val instanceof Date) return val.getTime();
  return 0;
};

const STATIC_SYSTEM_INSTRUCTION = `
You are the Senior Data Analyst for BraidStudio. Your job is to answer the stakeholder's question using the provided data.
RESPONSE FORMAT (Return strictly valid JSON):
{
  "observation": "A concise, high-level insight answering the question.",
  "evidence": "Specific data points.",
  "recommendation": "One strategic action."
}
`;

export const getPublisherHeatmapData = async (limitVal: number = 20): Promise<ContentAsset[]> => {
  try {
    const snapshot = await db.collection('activities').get();
    const assetMap: Record<string, ContentAsset> = {};

    snapshot.docs.forEach(docSnap => {
      const act = docSnap.data() as Activity;
      const bookTitle = act.source?.bookTitle || 'Unknown Book';
      const publisher = act.source?.publisher || 'Unknown Publisher';

      if (!assetMap[bookTitle]) {
        assetMap[bookTitle] = {
          id: bookTitle,
          bookTitle,
          publisher,
          totalRemixes: 0,
          totalInteractions: 0,
          cumulativeDelta: 0,
          cumulativeDifficultyChange: 0,
          lastInteractionTimestamp: act.createdAt,
          usageCount: 0
        };
      }

      const asset = assetMap[bookTitle];
      asset.usageCount = (asset.usageCount || 0) + 1;
      asset.totalRemixes += 1;
      
      const actTime = getMillis(act.createdAt);
      const assetTime = getMillis(asset.lastInteractionTimestamp);
      if (actTime > assetTime) {
        asset.lastInteractionTimestamp = act.createdAt;
      }
    });

    const assets = Object.values(assetMap);
    assets.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    return assets.slice(0, limitVal);
  } catch (error) {
    console.warn("Heatmap aggregation failed.", error);
    return [];
  }
};

export const getPulseMetrics = async (): Promise<PulseMetrics> => {
  let totalPings24h = 0;
  let topBook = "N/A";
  let topGrammar = "N/A";

  try {
    const statsDoc = await db.collection('system').doc('global_stats').get();
    if (statsDoc.exists) {
      totalPings24h = statsDoc.data()?.magicLinkPings || 0;
    }
  } catch (e) {
    totalPings24h = 0;
  }

  try {
    const snapshot = await db.collection('activities').get();
    
    if (!snapshot.empty) {
      const bookCounts: Record<string, number> = {};
      const grammarCounts: Record<string, number> = {};

      snapshot.docs.forEach(docSnap => {
        const act = docSnap.data() as Activity;
        const book = act.source?.bookTitle;
        if (book && book !== 'Unknown Book') {
          bookCounts[book] = (bookCounts[book] || 0) + 1;
        }
        if (act.contentPool?.grammar && Array.isArray(act.contentPool.grammar)) {
          act.contentPool.grammar.forEach(g => {
            if (g) grammarCounts[g] = (grammarCounts[g] || 0) + 1;
          });
        }
      });

      const sortedBooks = Object.entries(bookCounts).sort((a, b) => b[1] - a[1]);
      if (sortedBooks.length > 0) topBook = sortedBooks[0][0];

      const sortedGrammar = Object.entries(grammarCounts).sort((a, b) => b[1] - a[1]);
      if (sortedGrammar.length > 0) topGrammar = sortedGrammar[0][0];
    }
  } catch (e) {
    console.warn("Pulse metrics fetch failed:", e);
  }

  return { totalPings24h, topBook, topGrammar };
};

export const getRecentAssetFeed = async (limitVal: number = 5): Promise<FeedItem[]> => {
  try {
    const snapshot = await db.collection('activities').get();
    let feedItems: FeedItem[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data() as Activity;
      return {
        id: docSnap.id,
        bookTitle: data.source?.bookTitle || 'Unknown Source',
        publisher: data.source?.publisher || 'Unknown Publisher',
        pages: 'Activity',
        remixScore: data.source?.remixScore || 0,
        engagement: data.timesUsed || 0,
        timestamp: getMillis(data.createdAt)
      };
    });
    feedItems.sort((a, b) => b.timestamp - a.timestamp);
    return feedItems.slice(0, limitVal);
  } catch (error) {
    return [];
  }
};

export const getTrendingLanguage = async (): Promise<{vocab: LanguageTrend[], grammar: LanguageTrend[]}> => {
  try {
    const snapshot = await db.collection('activities').get();
    const docs = snapshot.docs.sort((a, b) => getMillis(b.data().createdAt) - getMillis(a.data().createdAt)).slice(0, 50);

    const vocabCounts: Record<string, number> = {};
    const grammarCounts: Record<string, number> = {};

    docs.forEach(docSnap => {
      const data = docSnap.data() as Activity;
      data.contentPool?.vocabulary?.forEach(v => {
        if (v && v.length > 2) vocabCounts[v] = (vocabCounts[v] || 0) + 1;
      });
      data.contentPool?.grammar?.forEach(g => {
        if (g && g.length > 2) grammarCounts[g] = (grammarCounts[g] || 0) + 1;
      });
    });

    const sortTrends = (counts: Record<string, number>, type: 'vocabulary' | 'grammar'): LanguageTrend[] => {
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([item, count]) => ({ item, count, type }));
    };

    return { vocab: sortTrends(vocabCounts, 'vocabulary'), grammar: sortTrends(grammarCounts, 'grammar') };
  } catch (error) {
    return { vocab: [], grammar: [] };
  }
};

export const askAiAnalyst = async (question: string): Promise<IntelligenceReport> => {
  try {
    // Initialize GoogleGenAI with the process.env.API_KEY directly in the function
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const assets = await getPublisherHeatmapData(15);
    const pulse = await getPulseMetrics();
    
    const contextData = assets.map(a => ({ id: a.bookTitle, pub: a.publisher, usage: a.usageCount || 0 }));
    const dynamicContext = `DATA CONTEXT: 24h Pings: ${pulse.totalPings24h}, Top Book: ${pulse.topBook}. DIGITAL ASSETS: ${JSON.stringify(contextData)}. QUESTION: "${question}"`;

    // Using gemini-3-pro-preview for complex reasoning tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: dynamicContext }] },
      config: { 
        responseMimeType: 'application/json', 
        systemInstruction: STATIC_SYSTEM_INSTRUCTION 
      }
    });

    // Access the extracted text using the .text property
    const responseText = response.text || '{}';
    return JSON.parse(responseText) as IntelligenceReport;
  } catch (error) {
    return { 
      observation: "Processing failed.", 
      evidence: "Internal connection interrupted.", 
      recommendation: "Retry later." 
    };
  }
};
