import { db, FieldValue } from './firebaseAdmin';

export interface BookInsight {
  bookTitle: string;
  publisher: string;
  updatedAt: any;
  teacherCount: number;
  signalCount: number;
  excludedItems: { item: string; count: number }[];   // sorted desc, max 15
  preferredActivityTypes: string[];                    // top 2
  cefrCalibration: {
    [level: string]: {
      acceptRate: number;
      editDepthAvg: number;
      sampleSize: number;
    };
  };
}

export interface BookAggregationResult {
  processedCount: number;
  skippedCount: number;
}

function toDocId(bookTitle: string): string {
  return bookTitle.trim().replace(/[^a-zA-Z0-9\-_ ]/g, '_');
}

export async function runBookAggregation(): Promise<BookAggregationResult> {
  // 1. Build bookTitle → publisher lookup from contentAssets
  const assetsSnap = await db.collection('contentAssets').get();
  const publisherMap = new Map<string, string>();
  for (const doc of assetsSnap.docs) {
    const d = doc.data();
    if (d.bookTitle && d.publisher) {
      publisherMap.set(d.bookTitle.trim(), d.publisher);
    }
  }

  // 2. Collect all users
  const usersSnap = await db.collection('users').get();
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const bookTeachers = new Map<string, Set<string>>();
  const bookSignals  = new Map<string, any[]>();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const signalsSnap = await db
      .collection('users').doc(uid)
      .collection('poolSignals')
      .where('timestamp', '>=', cutoffDate)
      .get();

    if (signalsSnap.empty) continue;

    for (const sigDoc of signalsSnap.docs) {
      const sig = sigDoc.data();
      const bookTitle = (sig.materialId as string | undefined)?.trim();
      if (!bookTitle) continue;

      if (!bookTeachers.has(bookTitle)) bookTeachers.set(bookTitle, new Set());
      bookTeachers.get(bookTitle)!.add(sig.teacherId || uid);

      if (!bookSignals.has(bookTitle)) bookSignals.set(bookTitle, []);
      bookSignals.get(bookTitle)!.push(sig);
    }
  }

  // 3. Compute + write per book
  let processedCount = 0;

  for (const [bookTitle, signals] of bookSignals.entries()) {
    const publisher = publisherMap.get(bookTitle) ?? 'Unknown';
    const teachers  = bookTeachers.get(bookTitle)!;

    // excludedItems — top 15
    const exclusionCounts = new Map<string, number>();
    for (const s of signals) {
      if (s.signalType === 'item_excluded' && s.itemA) {
        exclusionCounts.set(s.itemA, (exclusionCounts.get(s.itemA) ?? 0) + 1);
      }
    }
    const excludedItems = [...exclusionCounts.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 15)
      .map(([item, count]) => ({ item, count }));

    // preferredActivityTypes — top 2 by activity_accepted
    const acceptCounts = new Map<string, number>();
    for (const s of signals) {
      if (s.signalType === 'activity_accepted' && s.activityType) {
        acceptCounts.set(s.activityType, (acceptCounts.get(s.activityType) ?? 0) + 1);
      }
    }
    const preferredActivityTypes = [...acceptCounts.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);

    // cefrCalibration — min 3 signals per level
    const cefrData = new Map<string, {
      accepted: number; total: number; editDepthSum: number; editDepthCount: number;
    }>();
    for (const s of signals) {
      if (!s.cefrLevel) continue;
      const e = cefrData.get(s.cefrLevel) ??
        { accepted: 0, total: 0, editDepthSum: 0, editDepthCount: 0 };
      if (s.signalType === 'activity_accepted') { e.accepted++; e.total++; }
      if (s.signalType === 'activity_edited') {
        e.total++;
        if (s.editDepth != null) { e.editDepthSum += s.editDepth; e.editDepthCount++; }
      }
      cefrData.set(s.cefrLevel, e);
    }
    const cefrCalibration: BookInsight['cefrCalibration'] = {};
    for (const [level, e] of cefrData.entries()) {
      if (e.total < 3) continue;
      cefrCalibration[level] = {
        acceptRate:   e.accepted / e.total,
        editDepthAvg: e.editDepthCount > 0 ? e.editDepthSum / e.editDepthCount : 0,
        sampleSize:   e.total,
      };
    }

    const docId = toDocId(bookTitle);
    await db.collection('bookInsights').doc(docId).set({
      bookTitle,
      publisher,
      updatedAt: FieldValue.serverTimestamp(),
      teacherCount: teachers.size,
      signalCount: signals.length,
      excludedItems,
      preferredActivityTypes,
      cefrCalibration,
    });
    console.log(`[book-aggregate] written bookTitle="${bookTitle}" signals=${signals.length}`);
    processedCount++;
  }

  const skippedCount = Math.max(0, assetsSnap.size - processedCount);
  return { processedCount, skippedCount };
}
