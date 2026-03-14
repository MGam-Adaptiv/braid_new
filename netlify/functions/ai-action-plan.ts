import { Handler } from '@netlify/functions';
import { Mistral } from '@mistralai/mistralai';

interface BookBrief {
  book: string;
  publisher: string;
  observation: string;
  gap: string;
  recommendation: string;
}

interface ActionPlanResponse {
  overallBrief: string;
  bookBriefs: BookBrief[];
  seasonalNote: string;
}

interface ActionPlanRequest {
  selectedPublisher: string;
  timeRange: string;
  totalActivities: number;
  supplementationRanking: { book: string; publisher: string; count: number; pressure: number }[];
  skillGapData: { skill: string; count: number; pct: number }[];
  cefrDriftData: { book: string; statedLevel: string; actualLevel: string; driftDir: string; driftSteps: number }[];
  unitPressureTop: { unit: string; book: string; count: number }[];
  contentLongevity: { book: string; trend: string; recentCount: number; priorCount: number }[];
  digitalReadiness: { book: string; total: number; interactive: number; pct: number }[];
  adaptationSummary: { key: string; label: string; count: number }[];
}

const ACADEMIC_CALENDAR: Record<number, string> = {
  0: 'January — mid school year, assessment consolidation phase',
  1: 'February — mid school year, second-term peak activity',
  2: 'March — end of second term, skill revision pressure high',
  3: 'April — start of third term or spring semester',
  4: 'May — pre-exam period, supplementation demand peaks',
  5: 'June — end of year, exam preparation and review',
  6: 'July — summer break or end-of-year wind-down',
  7: 'August — back-to-school preparation, new cohort incoming',
  8: 'September — start of school year, highest new activity creation',
  9: 'October — early school year, establishing classroom routines',
  10: 'November — mid first term, foundational skills consolidation',
  11: 'December — end of first term, review and assessment',
};

const TIME_RANGE_LABEL: Record<string, string> = {
  day: 'last 24 hours',
  week: 'last 7 days',
  month: 'last 30 days',
  year: 'last 12 months',
  all: 'all time',
};

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing MISTRAL_API_KEY' }) };
  }

  const body: ActionPlanRequest = JSON.parse(event.body || '{}');
  const client = new Mistral({ apiKey });

  const isAllPublishers = body.selectedPublisher === 'All Publishers';
  const currentMonth = new Date().getMonth();
  const academicContext = ACADEMIC_CALENDAR[currentMonth];
  const timeLabel = TIME_RANGE_LABEL[body.timeRange] || 'all time';

  // For All Publishers, cap books to top 5 to keep prompt short and avoid timeouts
  const bookLimit = isAllPublishers ? 5 : 8;
  const books = body.supplementationRanking.slice(0, bookLimit).map(b => b.book);

  const dataContext = `
SCOPE: ${isAllPublishers ? 'All Publishers — platform-wide view' : `${body.selectedPublisher} — publisher-specific view`}
TIME WINDOW: ${timeLabel}
TOTAL ACTIVITIES ANALYSED: ${body.totalActivities}
ACADEMIC CALENDAR CONTEXT: ${academicContext}

SUPPLEMENTATION PRESSURE (books ranked by teacher effort):
${body.supplementationRanking.slice(0, 8).map((b, i) => `  ${i + 1}. ${b.book} [${b.publisher}] — ${b.count} activities, ${b.pressure}% of effort`).join('\n')}

SKILL GAP — most supplemented skills (= under-served in books):
${body.skillGapData.slice(0, 6).map(s => `  ${s.skill}: ${s.count} activities (${s.pct}%)`).join('\n')}

CEFR DRIFT — teacher level vs book stated level:
${body.cefrDriftData.slice(0, 8).map(b => `  ${b.book}: stated ${b.statedLevel || 'unknown'}, actual ${b.actualLevel} (${b.driftDir === 'down' ? 'DRIFT DOWN' : b.driftDir === 'up' ? 'DRIFT UP' : b.driftDir === 'aligned' ? 'ALIGNED' : 'UNKNOWN'})`).join('\n') || '  No drift data available'}

UNIT PRESSURE — most supplemented units:
${body.unitPressureTop.slice(0, 5).map((u, i) => `  ${i + 1}. "${u.unit}" [${u.book}] — ${u.count}×`).join('\n') || '  No unit tag data'}

CONTENT LONGEVITY — usage trend:
  Rising: ${body.contentLongevity.filter(b => b.trend === 'rising').map(b => b.book).join(', ') || 'none'}
  Falling: ${body.contentLongevity.filter(b => b.trend === 'falling').map(b => b.book).join(', ') || 'none'}
  Stable: ${body.contentLongevity.filter(b => b.trend === 'stable').map(b => b.book).join(', ') || 'none'}

DIGITAL READINESS — interactive activity %:
${body.digitalReadiness.slice(0, 6).map(b => `  ${b.book}: ${b.pct}% (${b.interactive}/${b.total})`).join('\n') || '  No data'}

ADAPTATION SIGNALS — how teachers modify content:
${body.adaptationSummary.map(a => `  ${a.label}: ${a.count}×`).join('\n') || '  No adaptations recorded'}

BOOKS TO INCLUDE IN PER-BOOK ANALYSIS:
${books.join(', ') || 'None'}
`.trim();

  const systemPrompt = `You are an education intelligence analyst for BraidStudio. Respond with ONLY valid JSON — no markdown, no preamble, nothing outside the JSON.

{"overallBrief":"3 paragraphs separated by newlines. Pattern → implication → priority action. Use specific numbers. Plain prose only — no asterisks or markdown.","bookBriefs":[{"book":"exact title","publisher":"publisher name","observation":"2-3 sentences with numbers.","gap":"2-3 sentences on content weakness.","recommendation":"2-3 sentences, one specific action."}],"seasonalNote":"1-2 sentences on timing given ${academicContext}."}

Rules: one bookBrief per book in BOOKS TO INCLUDE. Plain prose only — no asterisks, bold, or headers. Use numbers and book names.`;

  // Abort after 22s so we return a proper error before the Netlify CLI kills the connection
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 22000);

  try {
    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      temperature: 0.35,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate the action plan using this data:\n\n${dataContext}` }
      ]
    });

    clearTimeout(timeoutId);

    const raw = response.choices?.[0]?.message?.content || '';
    const usageData = response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const tokensUsed = {
      promptTokens: usageData.promptTokens,
      completionTokens: usageData.completionTokens,
      totalTokens: usageData.totalTokens || (usageData.promptTokens + usageData.completionTokens),
      model: 'mistral-small-latest'
    };

    // Robustly extract the JSON object — handles preamble text, markdown fencing, extra whitespace
    let parsed: ActionPlanResponse;
    try {
      // Strip markdown fences first
      const stripped = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      // Find the first complete JSON object in the response
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found');
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // Hard fallback: surface the raw text so the UI shows something
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Model returned unparseable response. Please regenerate.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed, tokensUsed })
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError' || err.message?.includes('abort');
    console.error('ai-action-plan error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: isTimeout ? 'Request timed out — try a narrower time range or fewer books.' : (err.message || 'Generation failed') })
    };
  }
};

export { handler };
