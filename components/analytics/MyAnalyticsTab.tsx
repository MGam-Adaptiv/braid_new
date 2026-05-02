import React, { useEffect, useState } from 'react';
import { Activity } from '../../types';
import { db } from '../../lib/firebase';
import { getMagicLinksForTeacher } from '../../services/firestoreService';
import { BarChart2, RefreshCw, Play } from 'lucide-react';

interface ActivityStat {
  sessions: number;
  students: number;
  totalScore: number;
  totalQuestions: number;
  lastRun: Date | null;
}

interface Props {
  activities: Activity[];
  userId: string;
  onViewResults: (activity: Activity) => void;
}

const scoreColor = (pct: number | null) => {
  if (pct === null) return 'text-gray-400';
  if (pct >= 70) return 'text-green-600';
  if (pct >= 50) return 'text-amber-500';
  return 'text-red-500';
};

const scoreBg = (pct: number | null) => {
  if (pct === null) return 'bg-gray-100';
  if (pct >= 70) return 'bg-green-50';
  if (pct >= 50) return 'bg-amber-50';
  return 'bg-red-50';
};

const formatDate = (d: Date | null) => {
  if (!d) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const MyAnalyticsTab: React.FC<Props> = ({ activities, userId, onViewResults }) => {
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, ActivityStat>>({});

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    setLoading(true);
    try {
      const links = await getMagicLinksForTeacher(userId);

      // Batch fetch all response subcollections
      const responseSets = await Promise.all(
        links.map(link =>
          db.collection('magicLinks').doc(link.id).collection('responses').get()
            .then(snap => snap.docs.map(d => ({
              ...(d.data() as any),
              _activityId: (link as any).activityId,
            })))
            .catch(() => [])
        )
      );

      const map: Record<string, ActivityStat> = {};

      // Count sessions per activity
      links.forEach((link: any) => {
        const aid = link.activityId as string;
        if (!aid) return;
        if (!map[aid]) map[aid] = { sessions: 0, students: 0, totalScore: 0, totalQuestions: 0, lastRun: null };
        map[aid].sessions += 1;
        const createdAt = link.createdAt?.toDate?.() || null;
        if (createdAt && (!map[aid].lastRun || createdAt > map[aid].lastRun!)) {
          map[aid].lastRun = createdAt;
        }
      });

      // Aggregate response data
      responseSets.flat().forEach((r: any) => {
        const aid = r._activityId as string;
        if (!aid || !map[aid]) return;
        map[aid].students += 1;
        map[aid].totalScore += r.score || 0;
        map[aid].totalQuestions += r.totalQuestions || 0;
        const submitted = r.submittedAt?.toDate?.() || null;
        if (submitted && (!map[aid].lastRun || submitted > map[aid].lastRun!)) {
          map[aid].lastRun = submitted;
        }
      });

      setStatsMap(map);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const activitiesWithData = activities.filter(a => statsMap[a.id]);
  const totalSessions = Object.values(statsMap).reduce((s, v) => s + v.sessions, 0);
  const totalStudents = Object.values(statsMap).reduce((s, v) => s + v.students, 0);
  const totalScore = Object.values(statsMap).reduce((s, v) => s + v.totalScore, 0);
  const totalQ = Object.values(statsMap).reduce((s, v) => s + v.totalQuestions, 0);
  const overallAvg = totalQ > 0 ? Math.round((totalScore / totalQ) * 100) : null;

  const sortedActivities = [...activitiesWithData].sort((a, b) => {
    const ta = statsMap[a.id]?.lastRun?.getTime() || 0;
    const tb = statsMap[b.id]?.lastRun?.getTime() || 0;
    return tb - ta;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="animate-spin text-coral" size={28} />
      </div>
    );
  }

  if (sortedActivities.length === 0) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-[24px] flex items-center justify-center text-gray-300 mb-6">
          <BarChart2 size={32} />
        </div>
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">No results yet</h3>
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest max-w-[280px] leading-relaxed">
          Share an activity with students to start seeing results here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Activities', value: activitiesWithData.length },
          { label: 'Sessions run', value: totalSessions },
          { label: 'Students', value: totalStudents },
          { label: 'Avg Score', value: overallAvg !== null ? `${overallAvg}%` : '—' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">{card.label}</p>
            <p className="text-3xl font-black text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Activity table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

        {/* Table header */}
        <div className="hidden lg:grid px-6 py-3 border-b border-gray-100 bg-gray-50 grid-cols-[1fr_72px_80px_90px_130px_110px] gap-4 items-center">
          {['Activity', 'Sessions', 'Students', 'Avg Score', 'Last Run', ''].map(h => (
            <p key={h} className="text-[8px] font-black uppercase tracking-widest text-gray-400">{h}</p>
          ))}
        </div>

        {/* Rows */}
        {sortedActivities.map(activity => {
          const s = statsMap[activity.id];
          const avg = s.totalQuestions > 0 ? Math.round((s.totalScore / s.totalQuestions) * 100) : null;

          return (
            <div
              key={activity.id}
              className="px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors
                         flex flex-col gap-3
                         lg:grid lg:grid-cols-[1fr_72px_80px_90px_130px_110px] lg:gap-4 lg:items-center"
            >
              {/* Title + type */}
              <div>
                <p className="font-black text-gray-900 text-sm uppercase leading-tight line-clamp-2">
                  {activity.title}
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                  {activity.activityType || 'Mixed'}
                </p>
              </div>

              {/* Mobile: inline stats row */}
              <div className="flex items-center gap-4 lg:contents">
                <div className="flex flex-col items-center lg:block">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 lg:hidden mb-0.5">Sessions</p>
                  <p className="text-sm font-black text-gray-700">{s.sessions}</p>
                </div>
                <div className="flex flex-col items-center lg:block">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 lg:hidden mb-0.5">Students</p>
                  <p className="text-sm font-black text-gray-700">{s.students}</p>
                </div>
                <div className="flex flex-col items-center lg:block">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 lg:hidden mb-0.5">Avg Score</p>
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-sm font-black ${scoreBg(avg)} ${scoreColor(avg)}`}>
                    {avg !== null ? `${avg}%` : '—'}
                  </span>
                </div>
                <div className="flex flex-col items-center lg:block">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 lg:hidden mb-0.5">Last Run</p>
                  <p className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{formatDate(s.lastRun)}</p>
                </div>
                <button
                  onClick={() => onViewResults(activity)}
                  className="px-3 py-2 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all flex items-center gap-1.5"
                >
                  <Play size={9} /> Results
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
