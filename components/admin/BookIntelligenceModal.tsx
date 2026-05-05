import React, { useMemo } from 'react';
import {
  X, BookOpen, Users, BarChart2, TrendingUp, TrendingDown, Minus,
  Zap, Layers, Globe, Target, Activity, Brain, MapPin, School,
} from 'lucide-react';

interface Props {
  bookTitle: string;
  publisher: string;
  allActivities: any[];
  allMaterials: any[];
  users: any[];
  onClose: () => void;
}

// ── Label maps ────────────────────────────────────────────────────────────────
const ENHANCE_LABEL: Record<string, string> = {
  simplify:            'Simplified',
  increase_difficulty: 'Increased Difficulty',
  add_scaffolding:     'Added Scaffolding',
  add_lead_in:         'Added Lead-In',
  convert_pair_work:   'Pair Work',
  localise_context:    'Localised',
};
const SCHOOL_LABELS: Record<string, string> = {
  language_school: 'Language School', state_school: 'State School',
  university: 'University',          private_tutor: 'Private Tutor',
};
const AGE_LABELS:   Record<string, string> = {
  young_learners: 'Young Learners', teens: 'Teens',
  adults: 'Adults',                 mixed: 'Mixed Ages',
};
const SIZE_LABELS:  Record<string, string> = {
  one_to_one: '1-to-1', small: 'Small (2–8)', group: 'Group (9–20)', large: 'Large (20+)',
};
const SCHOOL_EMOJI: Record<string, string> = { language_school:'🏫', state_school:'🏛️', university:'🎓', private_tutor:'👤' };
const AGE_EMOJI:    Record<string, string> = { young_learners:'🧒', teens:'🧑', adults:'👨‍💼', mixed:'👥' };
const SIZE_EMOJI:   Record<string, string> = { one_to_one:'🤝', small:'👫', group:'👨‍👩‍👧‍👦', large:'🏟️' };
const CEFR_ORDER    = ['A1','A2','B1','B2','C1','C2'];
const CEFR_COLORS: Record<string, string> = { A1:'#10b981', A2:'#34d399', B1:'#6366f1', B2:'#8b5cf6', C1:'#f59e0b', C2:'#ef4444' };

// ── Small reusable components ─────────────────────────────────────────────────
const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> =
  ({ title, icon, children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="text-gray-400">{icon}</div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">{title}</h4>
      </div>
      {children}
    </div>
  );

const StatPill: React.FC<{ label: string; value: string | number; color?: string }> =
  ({ label, value, color = 'text-gray-900' }) => (
    <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
      <span className={`text-2xl font-black ${color}`}>{value}</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5 text-center">{label}</span>
    </div>
  );

const HBar: React.FC<{ label: string; count: number; total: number; color: string; emoji?: string }> =
  ({ label, count, total, color, emoji }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div className="flex items-center gap-2 mb-1.5">
        {emoji && <span className="text-base w-5 flex-shrink-0">{emoji}</span>}
        <div className="w-24 text-xs font-bold text-gray-600 truncate flex-shrink-0">{label}</div>
        <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden">
          <div className="h-full rounded-md flex items-center px-2 transition-all duration-500"
            style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color, minWidth: count > 0 ? '20px' : '0' }}>
            {count > 0 && <span className="text-[10px] font-black text-white">{count}</span>}
          </div>
        </div>
        <div className="w-8 text-right text-[10px] font-bold text-gray-400 flex-shrink-0">{pct}%</div>
      </div>
    );
  };

// ── Main Modal ────────────────────────────────────────────────────────────────
const BookIntelligenceModal: React.FC<Props> = ({
  bookTitle, publisher, allActivities, allMaterials, users, onClose,
}) => {

  const data = useMemo(() => {
    const acts = allActivities.filter(a => a.source?.bookTitle === bookTitle);
    if (acts.length === 0) return null;

    const total = acts.length;
    const teacherUids = [...new Set(acts.map(a => a.userId).filter(Boolean))];
    const teacherCount = teacherUids.length;

    // ── Dates ──────────────────────────────────────────────────────────────
    const dates = acts
      .map(a => a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt ? new Date(a.createdAt) : null)
      .filter(Boolean) as Date[];
    const firstSeen = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const lastActive = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

    // ── Demographics ───────────────────────────────────────────────────────
    const profiledUsers = teacherUids
      .map(uid => users.find(u => u.uid === uid))
      .filter(u => u && (u as any).profile);

    const countryCounts: Record<string, number> = {};
    const schoolCounts:  Record<string, number> = {};
    const ageCounts:     Record<string, number> = {};
    const sizeCounts:    Record<string, number> = {};

    profiledUsers.forEach(u => {
      const p = (u as any).profile;
      if (p.country) countryCounts[p.country] = (countryCounts[p.country] || 0) + 1;
      (p.schoolType || []).forEach((v: string) => { schoolCounts[v] = (schoolCounts[v] || 0) + 1; });
      (p.ageRange   || []).forEach((v: string) => { ageCounts[v]    = (ageCounts[v]    || 0) + 1; });
      (p.classSize  || []).forEach((v: string) => { sizeCounts[v]   = (sizeCounts[v]   || 0) + 1; });
    });

    const topCountries = Object.entries(countryCounts).sort((a,b) => b[1]-a[1]).slice(0, 8);
    const profiledCount = profiledUsers.length;

    // ── CEFR Distribution ──────────────────────────────────────────────────
    const cefrCounts: Record<string, number> = { A1:0, A2:0, B1:0, B2:0, C1:0, C2:0 };
    acts.forEach(a => { const l = a.level || a.cefr; if (l && cefrCounts[l] !== undefined) cefrCounts[l]++; });

    // Stated level from materials
    const matLevel = allMaterials.find(m => m.bookTitle === bookTitle)?.level || null;

    // CEFR drift
    const actualTopCefr = Object.entries(cefrCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
    const statedIdx  = matLevel ? CEFR_ORDER.indexOf(matLevel) : -1;
    const actualIdx  = actualTopCefr ? CEFR_ORDER.indexOf(actualTopCefr) : -1;
    let driftDir: 'down'|'up'|'aligned'|'unknown' = 'unknown';
    let driftSteps = 0;
    if (statedIdx >= 0 && actualIdx >= 0) {
      driftSteps = actualIdx - statedIdx;
      driftDir = driftSteps < 0 ? 'down' : driftSteps > 0 ? 'up' : 'aligned';
    }

    // ── Methodology (activity types) ───────────────────────────────────────
    const typeCounts: Record<string, number> = {};
    acts.forEach(a => {
      const t = a.activityTypeName || a.activityType || a.category || a.type;
      if (t) typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const topTypes = Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).slice(0, 8);

    // ── Activity formats (digital readiness) ──────────────────────────────
    const FORMAT_LABEL: Record<string, string> = {
      'multiple-choice':'Multiple Choice', 'fill-blank':'Fill in the Blank',
      'matching':'Matching', 'true-false':'True / False',
      'ordering':'Ordering', 'open-ended':'Open Ended', 'multi-select':'Multi-Select',
    };
    const formatCounts: Record<string, number> = {};
    let interactiveCount = 0;
    acts.forEach((a: any) => {
      const qs = a.interactiveData?.questions || [];
      if (qs.length === 0) { formatCounts['Print Worksheet'] = (formatCounts['Print Worksheet']||0)+1; }
      else {
        interactiveCount++;
        const types = new Set<string>(qs.map((q: any) => q.type));
        types.forEach(t => { const l = FORMAT_LABEL[t]||t; formatCounts[l] = (formatCounts[l]||0)+1; });
      }
    });
    const digitalPct = total > 0 ? Math.round((interactiveCount / total) * 100) : 0;
    const topFormats = Object.entries(formatCounts).sort((a,b) => b[1]-a[1]);

    // ── Adaptation signals ─────────────────────────────────────────────────
    const enhCounts: Record<string, number> = {};
    acts.filter(a => a.enhancements?.length > 0).forEach(a => {
      (a.enhancements || []).forEach((e: string) => { enhCounts[e] = (enhCounts[e]||0)+1; });
    });
    const topEnhancements = Object.entries(enhCounts).sort((a,b) => b[1]-a[1]);
    const adaptedCount = acts.filter(a => a.enhancements?.length > 0).length;

    // ── Skills gap ─────────────────────────────────────────────────────────
    const skillCounts: Record<string, number> = {};
    acts.forEach(a => {
      const s = a.activityTypeName || a.activityType || a.category || a.type;
      if (s) skillCounts[s] = (skillCounts[s]||0)+1;
    });
    const topSkills = Object.entries(skillCounts).sort((a,b) => b[1]-a[1]).slice(0, 6);

    // ── Unit pressure ──────────────────────────────────────────────────────
    const unitCounts: Record<string, number> = {};
    acts.forEach(a => {
      (a.source?.pages || []).forEach((p: any) => {
        (p.unitTags || []).forEach((u: string) => { unitCounts[u] = (unitCounts[u]||0)+1; });
      });
    });
    const topUnits = Object.entries(unitCounts).sort((a,b) => b[1]-a[1]).slice(0, 10);

    // ── Content longevity ──────────────────────────────────────────────────
    const now = new Date();
    const monthKeys = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const monthCounts: Record<string, number> = {};
    monthKeys.forEach(k => { monthCounts[k] = 0; });
    acts.forEach(a => {
      const d = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt ? new Date(a.createdAt) : null;
      if (d) { const k = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); if (k in monthCounts) monthCounts[k]++; }
    });
    const monthSeries = monthKeys.map(k => ({ label: k, count: monthCounts[k] }));
    const prior  = monthSeries[1].count + monthSeries[2].count;
    const recent = monthSeries[4].count + monthSeries[5].count;
    let trend: 'rising'|'falling'|'stable'|'new' = 'stable';
    if (total <= 1) trend = 'new';
    else if (prior === 0 && recent > 0) trend = 'rising';
    else if (recent > prior * 1.3) trend = 'rising';
    else if (recent < prior * 0.7) trend = 'falling';
    const maxMonth = Math.max(...monthSeries.map(m => m.count), 1);

    return {
      total, teacherCount, firstSeen, lastActive,
      topCountries, profiledCount,
      schoolCounts, ageCounts, sizeCounts,
      cefrCounts, matLevel, actualTopCefr, driftDir, driftSteps,
      topTypes, topFormats, digitalPct, interactiveCount,
      topEnhancements, adaptedCount,
      topSkills,
      topUnits,
      monthSeries, maxMonth, trend, recent, prior,
    };
  }, [bookTitle, allActivities, allMaterials, users]);

  if (!data) return null;

  const driftColor = data.driftDir === 'down' ? '#10b981' : data.driftDir === 'up' ? '#ef4444' : data.driftDir === 'aligned' ? '#6366f1' : '#9ca3af';
  const driftIcon  = data.driftDir === 'down' ? '📉' : data.driftDir === 'up' ? '📈' : data.driftDir === 'aligned' ? '✅' : '❓';
  const trendColor = data.trend === 'rising' ? '#10b981' : data.trend === 'falling' ? '#ef4444' : '#6366f1';
  const trendIcon  = data.trend === 'rising' ? '📈' : data.trend === 'falling' ? '📉' : data.trend === 'new' ? '🆕' : '📊';

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-gray-50 rounded-3xl w-full max-w-5xl shadow-2xl my-4">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-gray-900 rounded-t-3xl px-8 py-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-coral px-2 py-1 bg-coral/20 rounded-md">
                Book Intelligence
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{publisher}</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase leading-tight">{bookTitle}</h2>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-gray-400">
              {data.firstSeen && <span>First seen {data.firstSeen.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>}
              {data.lastActive && <span>Last active {data.lastActive.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors mt-1">
            <X size={20} />
          </button>
        </div>

        {/* ── Overview strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 pb-0">
          <StatPill label="Activities Created" value={data.total} color="text-coral" />
          <StatPill label="Teachers Using" value={data.teacherCount} color="text-indigo-600" />
          <StatPill label="Digital Ready" value={`${data.digitalPct}%`} color="text-emerald-600" />
          <StatPill label="Adapted" value={`${data.adaptedCount > 0 ? Math.round((data.adaptedCount / data.total) * 100) : 0}%`} color="text-amber-600" />
        </div>

        {/* ── Content grid ────────────────────────────────────────────────── */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 1. CEFR Distribution */}
          <Card title="CEFR Level Distribution" icon={<Target size={14} />}>
            {data.matLevel && (
              <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-500">
                📚 Stated level: <span className="font-black text-gray-700">{data.matLevel}</span>
                {data.actualTopCefr && data.actualTopCefr !== data.matLevel && (
                  <span className="ml-2">→ Mostly taught at <span className="font-black" style={{ color: driftColor }}>{data.actualTopCefr}</span></span>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              {CEFR_ORDER.map(level => (
                <HBar key={level} label={level} count={data.cefrCounts[level] || 0} total={data.total} color={CEFR_COLORS[level]} />
              ))}
            </div>
          </Card>

          {/* 2. CEFR Drift */}
          <Card title="CEFR Drift Indicator" icon={<Activity size={14} />}>
            <div className="text-center py-4">
              <div className="text-5xl mb-3">{driftIcon}</div>
              <div className="text-2xl font-black mb-1" style={{ color: driftColor }}>
                {data.driftDir === 'unknown' ? 'No Data' :
                 data.driftDir === 'aligned' ? 'On Level' :
                 data.driftDir === 'down' ? `${Math.abs(data.driftSteps)} level${Math.abs(data.driftSteps)!==1?'s':''} below` :
                 `${data.driftSteps} level${data.driftSteps!==1?'s':''} above`}
              </div>
              <div className="text-xs text-gray-400 font-medium">
                {data.matLevel
                  ? `Stated: ${data.matLevel} → Taught: ${data.actualTopCefr || '?'}`
                  : 'No stated level in materials'}
              </div>
              {data.driftDir !== 'unknown' && data.driftDir !== 'aligned' && (
                <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-500">
                  {data.driftDir === 'down'
                    ? 'Teachers are simplifying content — possible difficulty gap'
                    : 'Teachers are pushing beyond book level — strong learners'}
                </div>
              )}
            </div>
          </Card>

          {/* 3. Methodology — How It's Taught */}
          <Card title="How It's Taught — Methodology" icon={<Layers size={14} />}>
            {data.topTypes.length === 0
              ? <p className="text-xs text-gray-400 py-4 text-center">No activity type data</p>
              : data.topTypes.map(([type, count]) => (
                  <HBar key={type} label={type.replace(/_/g,' ')} count={count} total={data.total} color="#EF3D5A" />
                ))
            }
          </Card>

          {/* 4. Digital Readiness + Formats */}
          <Card title="Digital Readiness" icon={<Zap size={14} />}>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4"
                    strokeDasharray={`${data.digitalPct * 0.879} 87.9`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black text-gray-900">{data.digitalPct}%</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-black text-gray-900">{data.interactiveCount} interactive</div>
                <div className="text-xs text-gray-400">{data.total - data.interactiveCount} print worksheets</div>
              </div>
            </div>
            <div className="space-y-1">
              {data.topFormats.map(([fmt, count]) => (
                <HBar key={fmt} label={fmt} count={count} total={data.total} color="#6366f1" />
              ))}
            </div>
          </Card>

          {/* 5. Adaptation Signals */}
          <Card title="Adaptation Signals" icon={<Brain size={14} />}>
            {data.topEnhancements.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No adaptations recorded</p>
            ) : (
              <>
                <p className="text-[10px] font-bold text-gray-400 mb-3">
                  {data.adaptedCount} of {data.total} activities were modified by teachers
                </p>
                {data.topEnhancements.map(([key, count]) => (
                  <HBar key={key} label={ENHANCE_LABEL[key] || key} count={count} total={data.adaptedCount} color="#f59e0b" />
                ))}
              </>
            )}
          </Card>

          {/* 6. Skills Gap */}
          <Card title="Skills Gap Heatmap" icon={<BarChart2 size={14} />}>
            {data.topSkills.length === 0
              ? <p className="text-xs text-gray-400 py-4 text-center">No skills data</p>
              : data.topSkills.map(([skill, count]) => (
                  <HBar key={skill} label={skill.replace(/_/g,' ')} count={count} total={data.total} color="#8b5cf6" />
                ))
            }
          </Card>

          {/* 7. Unit Pressure Map */}
          <Card title="Unit Pressure Map" icon={<Target size={14} />} className="md:col-span-2">
            {data.topUnits.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-gray-400 font-medium">No unit tag data yet.</p>
                <p className="text-[10px] text-gray-300 mt-1">Unit tags need to be added to materials for this to populate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {data.topUnits.map(([unit, count]) => (
                  <div key={unit} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-xs font-bold text-gray-700 truncate">{unit}</span>
                    <span className="text-xs font-black text-coral ml-2 flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 8. Content Longevity */}
          <Card title="Content Longevity — Last 6 Months" icon={<TrendingUp size={14} />} className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{trendIcon}</span>
              <div>
                <span className="text-sm font-black capitalize" style={{ color: trendColor }}>{data.trend}</span>
                {data.trend !== 'new' && (
                  <span className="text-xs text-gray-400 ml-2">
                    {data.prior} → {data.recent} (recent vs prior 2-month window)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-end gap-1 h-20">
              {data.monthSeries.map(({ label, count }) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm transition-all duration-500 min-h-[2px]"
                    style={{ height: `${data.maxMonth > 0 ? (count / data.maxMonth) * 64 : 2}px`, backgroundColor: trendColor, opacity: count > 0 ? 1 : 0.2 }} />
                  <span className="text-[8px] font-bold text-gray-400 text-center leading-tight">{label.split(' ')[0]}</span>
                  <span className="text-[9px] font-black text-gray-600">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 9. Teacher Demographics */}
          {data.profiledCount > 0 && (
            <Card title={`Teacher Demographics — ${data.profiledCount} profiled`} icon={<Globe size={14} />} className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Countries */}
                <div className="md:col-span-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">📍 Top Countries</p>
                  {data.topCountries.map(([country, count]) => (
                    <HBar key={country} label={country} count={count} total={data.profiledCount} color="#EF3D5A" />
                  ))}
                </div>

                {/* School type */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">🏫 School Type</p>
                  {Object.entries(SCHOOL_LABELS).map(([k, label]) => (
                    <HBar key={k} label={label} count={data.schoolCounts[k]||0} total={data.profiledCount} color="#6366f1" emoji={SCHOOL_EMOJI[k]} />
                  ))}
                </div>

                {/* Age range + class size */}
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">👥 Who They Teach</p>
                    {Object.entries(AGE_LABELS).map(([k, label]) => (
                      <HBar key={k} label={label} count={data.ageCounts[k]||0} total={data.profiledCount} color="#10b981" emoji={AGE_EMOJI[k]} />
                    ))}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">📐 Class Size</p>
                    {Object.entries(SIZE_LABELS).map(([k, label]) => (
                      <HBar key={k} label={label} count={data.sizeCounts[k]||0} total={data.profiledCount} color="#f59e0b" emoji={SIZE_EMOJI[k]} />
                    ))}
                  </div>
                </div>

              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default BookIntelligenceModal;
