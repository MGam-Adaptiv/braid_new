import { db, FieldValue } from './firebaseAdmin';

export interface AggregationResult {
  processedCount: number;
  skippedCount: number;
}

export async function runAggregation(): Promise<AggregationResult> {
  const usersSnapshot = await db.collection('users').get();
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let processedCount = 0;
  let skippedCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;

    const signalsSnapshot = await db
      .collection('users').doc(uid)
      .collection('poolSignals')
      .where('timestamp', '>=', cutoffDate)
      .get();

    if (signalsSnapshot.empty) {
      skippedCount++;
      continue;
    }

    const signals = signalsSnapshot.docs.map(d => d.data());
    const signalCount = signals.length;

    // ── excludedItems & alwaysExcludedItems (frequency-based inference) ──
    // alwaysExclude field does not exist on signals — infer from count:
    //   2+ exclusions → excludedItems, 5+ exclusions → alwaysExcludedItems
    const exclusionCounts = new Map<string, number>();
    for (const s of signals) {
      if (s.signalType === 'item_excluded' && s.itemA) {
        exclusionCounts.set(s.itemA, (exclusionCounts.get(s.itemA) ?? 0) + 1);
      }
    }
    const excludedItems = [...exclusionCounts.entries()]
      .filter(([, c]) => c >= 2)
      .map(([t]) => t);
    const alwaysExcludedItems = [...exclusionCounts.entries()]
      .filter(([, c]) => c >= 5)
      .map(([t]) => t);

    // ── preferredActivityTypes (top 2 by activity_accepted count) ──
    const acceptCounts = new Map<string, number>();
    for (const s of signals) {
      if (s.signalType === 'activity_accepted' && s.activityType) {
        acceptCounts.set(s.activityType, (acceptCounts.get(s.activityType) ?? 0) + 1);
      }
    }
    const preferredActivityTypes = [...acceptCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([t]) => t);

    // ── swapPatterns (item_swapped pairs with 2+ occurrences) ──
    const swapMap = new Map<string, number>();
    for (const s of signals) {
      if (s.signalType === 'item_swapped' && s.itemA && s.itemB) {
        const key = `${s.itemA}||${s.itemB}`;
        swapMap.set(key, (swapMap.get(key) ?? 0) + 1);
      }
    }
    const swapPatterns = [...swapMap.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([k, count]) => {
        const [from, to] = k.split('||');
        return { from, to, count };
      });

    // ── cefrCalibration (skip levels with < 2 signals — not enough data) ──
    const cefrData = new Map<string, {
      accepted: number;
      total: number;
      editDepthSum: number;
      editDepthCount: number;
    }>();
    for (const s of signals) {
      if (!s.cefrLevel) continue;
      const e = cefrData.get(s.cefrLevel) ??
        { accepted: 0, total: 0, editDepthSum: 0, editDepthCount: 0 };
      if (s.signalType === 'activity_accepted') {
        e.accepted++;
        e.total++;
      }
      if (s.signalType === 'activity_edited') {
        e.total++;
        if (s.editDepth != null) {
          e.editDepthSum += s.editDepth;
          e.editDepthCount++;
        }
      }
      cefrData.set(s.cefrLevel, e);
    }
    const cefrCalibration: Record<string, { acceptRate: number; editDepthAvg: number }> = {};
    for (const [level, e] of cefrData.entries()) {
      if (e.total < 2) continue;
      cefrCalibration[level] = {
        acceptRate: e.accepted / e.total,
        editDepthAvg: e.editDepthCount > 0 ? e.editDepthSum / e.editDepthCount : 0,
      };
    }

    // ── write poolPreferences/current ──
    await db
      .collection('users').doc(uid)
      .collection('poolPreferences').doc('current')
      .set({
        updatedAt: FieldValue.serverTimestamp(),
        signalCount,
        excludedItems,
        alwaysExcludedItems,
        preferredActivityTypes,
        swapPatterns,
        cefrCalibration,
      });

    console.log(`[aggregate] processed uid=${uid} signals=${signalCount}`);
    processedCount++;
  }

  return { processedCount, skippedCount };
}
