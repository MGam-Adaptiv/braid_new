import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import firebase from 'firebase/compat/app';
import { db } from '../lib/firebase';
import { getAllUsers, approveUserAccess } from '../services/userService';
import UserDetailPanel from './admin/UserDetailPanel';
import {
  Users, Activity, AlertTriangle, CheckCircle, RefreshCw,
  LayoutGrid, Shield, UserPlus, Infinity as InfinityIcon,
  BookOpen, FileText, Layers, Globe, ChevronDown,
  TrendingUp, TrendingDown, Minus, Zap, Target, BarChart2, Wifi, X, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { trackTokenUsage } from '../services/tokenService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList, AreaChart, Area } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'intelligence' | 'governance' | 'approvals'>('intelligence');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, totalTokens: 0 });
  
  // Token Overview State
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [platformTokenStats, setPlatformTokenStats] = useState({ allocated: 0, consumed: 0 });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tokenUsageLogs, setTokenUsageLogs] = useState<any[]>([]);
  const [tokenUsageLoading, setTokenUsageLoading] = useState(false);
  const [freeTierBudget, setFreeTierBudget] = useState(0.50); // € per user per month
  
  // Intelligence Tab State
  const [intelligenceStats, setIntelligenceStats] = useState({ publishers: 0, books: 0, materials: 0, activities: 0 });
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [publisherData, setPublisherData] = useState<{name: string, count: number}[]>([]);
  const [bookData, setBookData] = useState<{title: string, publisher: string, count: number, topType: string, topCefr: string}[]>([]);
  const [skillsData, setSkillsData] = useState<{name: string, count: number}[]>([]);
  const [formatData, setFormatData] = useState<{name: string, count: number}[]>([]);
  const [cefrData, setCefrData] = useState<{name: string, count: number}[]>([]);
  const [methodologyData, setMethodologyData] = useState<Record<string, Record<string, number>>>({});
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [teacherData, setTeacherData] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<{name: string, activities: number, sessions: number}[]>([]);
  const [allMagicLinks, setAllMagicLinks] = useState<any[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);

  const [uniquePublishers, setUniquePublishers] = useState<string[]>([]);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('All Publishers');
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);

  // Magic Ball — 6 Inference Insights
  const [supplementationData, setSupplementationData] = useState<{book: string, publisher: string, count: number, pressure: number}[]>([]);
  const [skillGapData, setSkillGapData] = useState<{skill: string, count: number, pct: number}[]>([]);
  const [cefrDriftData, setCefrDriftData] = useState<{book: string, publisher: string, statedLevel: string, actualLevel: string, driftDir: 'down' | 'up' | 'aligned' | 'unknown', driftSteps: number}[]>([]);
  const [unitPressureData, setUnitPressureData] = useState<{unit: string, book: string, count: number}[]>([]);
  const [contentLongevityData, setContentLongevityData] = useState<{book: string, publisher: string, trend: 'rising' | 'falling' | 'stable' | 'new', recentCount: number, priorCount: number}[]>([]);
  const [digitalReadinessData, setDigitalReadinessData] = useState<{book: string, publisher: string, total: number, interactive: number, pct: number}[]>([]);

  // Time Range Filter
  const [timeRange, setTimeRange] = useState<'all' | 'year' | 'month' | 'week' | 'day'>('all');

  // Action Plan
  const [parsedActionPlan, setParsedActionPlan] = useState<{overallBrief: string; bookBriefs: {book: string; publisher: string; observation: string; gap: string; recommendation: string}[]; seasonalNote: string} | null>(null);
  const [actionPlanLoading, setActionPlanLoading] = useState(false);
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [actionPlanTab, setActionPlanTab] = useState<'plan' | 'history' | 'compare'>('plan');
  const [actionPlanLogs, setActionPlanLogs] = useState<any[]>([]);
  const [actionPlanLogsLoading, setActionPlanLogsLoading] = useState(false);
  const [compareA, setCompareA] = useState<any>(null);
  const [compareB, setCompareB] = useState<any>(null);

  // Clear action plan logs when publisher scope changes so stale entries don't show
  useEffect(() => {
    setActionPlanLogs([]);
    setCompareA(null);
    setCompareB(null);
  }, [selectedPublisher]);

  // VIP Logic
  const VIP_EMAILS = ['teacher@test.com', 'admin@braidstudio.com'];
  const isUnlimited = (user: any) => VIP_EMAILS.includes(user.email) || user.isWhitelisted;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allUsers, globalStatsSnap] = await Promise.all([
        getAllUsers(),
        db.collection('system').doc('global_stats').get()
      ]);
      
      setUsers(allUsers);
      
      // Global Stats
      const budget = globalStatsSnap.exists ? globalStatsSnap.data()?.monthlyBudgetEUR || 0 : 0;
      setMonthlyBudget(budget);

      // Token Stats
      let allocated = 0;
      let consumed = 0;

      allUsers.forEach(u => {
        consumed += (u.totalTokensUsed || 0);
        if (!isUnlimited(u)) {
          allocated += (u.tokens || 0);
        }
      });

      setPlatformTokenStats({ allocated, consumed });

      const totalTokens = allUsers.reduce((acc, user) => acc + (user.totalTokensUsed || 0), 0);
      setStats({
        total: allUsers.length,
        active: allUsers.filter(u => u.status === 'approved').length,
        pending: allUsers.filter(u => u.status === 'pending').length,
        totalTokens
      });
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleResetUsage = async () => {
    try {
      await Promise.all(users.map(u => db.collection('users').doc(u.uid).update({ totalTokensUsed: 0 })));
      toast.success("All usage reset to 0");
      setShowResetConfirm(false);
      fetchData();
    } catch (error) {
      console.error("Reset failed", error);
      toast.error("Reset failed");
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === 'intelligence') {
      const fetchIntelligence = async () => {
        setIntelligenceLoading(true);
        try {
          const [materialsSnap, activitiesSnap, magicLinksSnap] = await Promise.all([
            db.collection('materials').get(),
            db.collection('activities').get(),
            db.collection('magicLinks').get()
          ]);

          const activities = activitiesSnap.docs.map(doc => {
            const data = doc.data();
            // Normalize publisher name immediately
            if (data.source?.publisher === 'Other') {
              if (!data.source) data.source = {};
              data.source.publisher = "Teacher's Own Materials";
            }
            return { ...data, id: doc.id };
          });

          const magicLinks = magicLinksSnap.docs.map(doc => doc.data());
          
          const uniquePublishersSet = new Set(activities.map((a: any) => a.source?.publisher).filter(Boolean));
          const uniqueBooks = new Set(activities.map((a: any) => a.source?.bookTitle).filter(Boolean));

          setAllActivities(activities);
          setAllMagicLinks(magicLinks);
          setAllMaterials(materialsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
          setUniquePublishers(Array.from(uniquePublishersSet).sort());

          setIntelligenceStats({
            publishers: uniquePublishersSet.size,
            books: uniqueBooks.size,
            materials: materialsSnap.size,
            activities: activitiesSnap.size
          });
        } catch (error) {
          console.error("Error fetching intelligence:", error);
          toast.error("Failed to load intelligence data");
        } finally {
          setIntelligenceLoading(false);
        }
      };
      fetchIntelligence();
    }
  }, [activeTab]);

  // Filter and Process Data Effect
  useEffect(() => {
    if (!allActivities.length) return;

    // Time range cutoff
    const now_tr = new Date();
    const TIME_CUTOFFS: Record<string, Date> = {
      day:   new Date(now_tr.getTime() - 24 * 60 * 60 * 1000),
      week:  new Date(now_tr.getTime() - 7  * 24 * 60 * 60 * 1000),
      month: new Date(now_tr.getTime() - 30 * 24 * 60 * 60 * 1000),
      year:  new Date(now_tr.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
    const applyTimeFilter = (acts: any[]) => {
      if (timeRange === 'all') return acts;
      const cutoff = TIME_CUTOFFS[timeRange];
      return acts.filter(a => {
        const d = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt ? new Date(a.createdAt) : null;
        return d && d >= cutoff;
      });
    };

    const publisherFiltered = selectedPublisher === 'All Publishers'
      ? allActivities
      : allActivities.filter(a => a.source?.publisher === selectedPublisher);

    const filteredActivities = applyTimeFilter(publisherFiltered);

    // 0. Platform Growth (Global - Last 6 Months)
    const activityMonths: Record<string, number> = {};
    const sessionMonths: Record<string, number> = {};
    const now = new Date();
    const last6Months: string[] = [];
    
    // Initialize last 6 months keys
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      activityMonths[key] = 0;
      sessionMonths[key] = 0;
      last6Months.push(key);
    }

    // Create map of activityId -> publisher for filtering magic links
    const activityPublisherMap: Record<string, string> = {};
    allActivities.forEach(a => {
      if (a.id) {
        activityPublisherMap[a.id] = a.source?.publisher;
      }
    });

    // Count Activities (use filtered list)
    filteredActivities.forEach(a => {
      let date: Date | null = null;
      if (a.createdAt?.toDate) {
        date = a.createdAt.toDate();
      } else if (a.createdAt) {
        date = new Date(a.createdAt);
      }

      if (date) {
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (activityMonths.hasOwnProperty(key)) {
          activityMonths[key]++;
        }
      }
    });

    // Count Sessions (Magic Links)
    allMagicLinks.forEach(link => {
      // Filter by publisher if needed
      if (selectedPublisher !== 'All Publishers') {
        const activityPublisher = activityPublisherMap[link.activityId];
        if (activityPublisher !== selectedPublisher) return;
      }

      let date: Date | null = null;
      if (link.createdAt?.toDate) {
        date = link.createdAt.toDate();
      } else if (link.createdAt) {
        date = new Date(link.createdAt);
      }

      if (date) {
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (sessionMonths.hasOwnProperty(key)) {
          sessionMonths[key]++;
        }
      }
    });

    setGrowthData(last6Months.map(month => ({ 
      name: month, 
      activities: activityMonths[month],
      sessions: sessionMonths[month]
    })));

    // 1. Publisher Data (for Donut)
    const publisherCounts: Record<string, number> = {};
    filteredActivities.forEach(a => {
      const pub = a.source?.publisher;
      if (pub) publisherCounts[pub] = (publisherCounts[pub] || 0) + 1;
    });

    const pData = Object.entries(publisherCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setPublisherData(pData);

    // 2. Book Data (for Table)
    const bookStats: Record<string, { publisher: string, count: number, types: Record<string, number>, cefrs: Record<string, number> }> = {};
    
    filteredActivities.forEach(a => {
      const bookTitle = a.source?.bookTitle;
      const type = a.activityType || a.category || a.type;
      const cefr = a.level || a.cefr;
      const publisher = a.source?.publisher;

      if (bookTitle) {
        if (!bookStats[bookTitle]) {
          bookStats[bookTitle] = { publisher: publisher || 'Unknown', count: 0, types: {}, cefrs: {} };
        }
        bookStats[bookTitle].count++;
        if (type) bookStats[bookTitle].types[type] = (bookStats[bookTitle].types[type] || 0) + 1;
        if (cefr) bookStats[bookTitle].cefrs[cefr] = (bookStats[bookTitle].cefrs[cefr] || 0) + 1;
      }
    });

    const bData = Object.entries(bookStats)
      .map(([title, data]) => ({
        title,
        publisher: data.publisher,
        count: data.count,
        topType: Object.entries(data.types).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
        topCefr: Object.entries(data.cefrs).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    setBookData(bData);

    // 3. Skills Focus (activityType -> category -> type)
    const skillsCounts: Record<string, number> = {};
    filteredActivities.forEach((a, index) => {
      if (index === 0) console.log("Sample Activity Fields:", a); // Debug log
      const skill = a.activityType || a.category || a.type;
      if (skill) skillsCounts[skill] = (skillsCounts[skill] || 0) + 1;
    });
    setSkillsData(Object.entries(skillsCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));

    // 4. Activity Formats — derived from delivery format, not skill type
    // Interactive activities: look at question types used
    // Non-interactive: "Print Worksheet"
    const formatCounts: Record<string, number> = {};
    const FORMAT_LABEL: Record<string, string> = {
      'multiple-choice': 'Multiple Choice',
      'fill-blank': 'Fill in the Blank',
      'matching': 'Matching',
      'true-false': 'True / False',
      'ordering': 'Ordering',
      'open-ended': 'Open Ended',
      'multi-select': 'Multi-Select',
    };
    filteredActivities.forEach((a: any) => {
      const questions = a.interactiveData?.questions || [];
      if (questions.length === 0) {
        formatCounts['Print Worksheet'] = (formatCounts['Print Worksheet'] || 0) + 1;
      } else {
        // Count unique question types used in this activity
        const typesUsed = new Set<string>(questions.map((q: any) => q.type));
        typesUsed.forEach(t => {
          const label = FORMAT_LABEL[t] || t;
          formatCounts[label] = (formatCounts[label] || 0) + 1;
        });
      }
    });
    setFormatData(Object.entries(formatCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));

    // 5. CEFR Level Distribution
    const cefrCounts: Record<string, number> = { 'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0, 'C1': 0, 'C2': 0 };
    filteredActivities.forEach(a => {
      const level = a.level || a.cefr;
      if (level && cefrCounts.hasOwnProperty(level)) {
        cefrCounts[level]++;
      }
    });
    setCefrData(Object.entries(cefrCounts).map(([name, count]) => ({ name, count })));

    // 6. Teaching Methodology Map
    const typesSet = new Set<string>();
    const publisherTypeCounts: Record<string, Record<string, number>> = {};
    
    // First pass: collect all skill types from ALL activities
    allActivities.forEach(a => {
      const t = a.activityType || a.category || a.type;
      if (t) typesSet.add(t);
    });
    const sortedTypes = Array.from(typesSet).sort();
    setActivityTypes(sortedTypes);

    // Second pass: aggregate counts for ALL publishers
    allActivities.forEach(a => {
      const pub = a.source?.publisher || "Teacher's Own Materials";
      const type = a.activityType || a.category || a.type;
      
      if (pub && type) {
        if (!publisherTypeCounts[pub]) publisherTypeCounts[pub] = {};
        publisherTypeCounts[pub][type] = (publisherTypeCounts[pub][type] || 0) + 1;
      }
    });
    setMethodologyData(publisherTypeCounts);

    // 7. Teacher Engagement
    const teacherStats: Record<string, {
      user: any,
      count: number,
      lastActive: Date,
      publishers: Record<string, number>,
      cefrs: Record<string, number>
    }> = {};

    filteredActivities.forEach(a => {
      const uid = a.userId;
      if (!uid) return;

      if (!teacherStats[uid]) {
        const user = users.find(u => u.uid === uid) || { displayName: 'Unknown User', email: 'N/A' };
        teacherStats[uid] = {
          user,
          count: 0,
          lastActive: new Date(0),
          publishers: {},
          cefrs: {}
        };
      }

      const stat = teacherStats[uid];
      stat.count++;

      // Date handling
      let date = new Date();
      if (a.createdAt?.toDate) {
        date = a.createdAt.toDate();
      } else if (a.createdAt) {
        date = new Date(a.createdAt);
      }
      
      if (date > stat.lastActive) stat.lastActive = date;

      // Publisher
      const pub = a.source?.publisher || "Teacher's Own Materials";
      stat.publishers[pub] = (stat.publishers[pub] || 0) + 1;

      // CEFR
      const cefr = a.level || a.cefr;
      if (cefr) stat.cefrs[cefr] = (stat.cefrs[cefr] || 0) + 1;
    });

    const tData = Object.values(teacherStats)
      .map(stat => {
        const topPublisher = Object.entries(stat.publishers).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        const topCefr = Object.entries(stat.cefrs).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        // Activity status
        const now = new Date();
        const diffDays = (now.getTime() - stat.lastActive.getTime()) / (1000 * 3600 * 24);
        let statusColor = '#9CA3AF'; // Gray
        if (diffDays <= 7) statusColor = '#10B981'; // Green
        else if (diffDays <= 30) statusColor = '#F59E0B'; // Amber

        return {
          name: stat.user.displayName || stat.user.email || 'Unknown',
          email: stat.user.email,
          count: stat.count,
          lastActive: stat.lastActive,
          topPublisher,
          topCefr,
          statusColor
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    setTeacherData(tData);

    // ─── MAGIC BALL: 6 INFERENCE INSIGHTS ──────────────────────────────────

    const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const totalCount = filteredActivities.length;

    // 1. SUPPLEMENTATION PRESSURE RANKING
    const suppCounts: Record<string, { publisher: string; count: number }> = {};
    filteredActivities.forEach((a: any) => {
      const book = a.source?.bookTitle;
      if (!book) return;
      if (!suppCounts[book]) suppCounts[book] = { publisher: a.source?.publisher || 'Unknown', count: 0 };
      suppCounts[book].count++;
    });
    const suppData = Object.entries(suppCounts)
      .map(([book, d]) => ({
        book,
        publisher: d.publisher,
        count: d.count,
        pressure: totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    setSupplementationData(suppData);

    // 2. SKILL GAP HEATMAP
    const skillCounts: Record<string, number> = {};
    filteredActivities.forEach((a: any) => {
      const s = a.activityType || a.category || a.type;
      if (s) skillCounts[s] = (skillCounts[s] || 0) + 1;
    });
    const skillTotal = Object.values(skillCounts).reduce((sum, n) => sum + n, 0);
    const sgData = Object.entries(skillCounts)
      .map(([skill, count]) => ({
        skill: skill.charAt(0).toUpperCase() + skill.slice(1).replace(/_/g, ' '),
        count,
        pct: skillTotal > 0 ? Math.round((count / skillTotal) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
    setSkillGapData(sgData);

    // 3. CEFR DRIFT INDICATOR
    // Build a lookup: bookTitle → stated level from materials
    const materialLevelMap: Record<string, string> = {};
    allMaterials.forEach((m: any) => {
      if (m.bookTitle && m.level) {
        // Use the first material's level per book as the stated level
        if (!materialLevelMap[m.bookTitle]) materialLevelMap[m.bookTitle] = m.level;
      }
    });
    const driftByBook: Record<string, { publisher: string; levels: Record<string, number> }> = {};
    filteredActivities.forEach((a: any) => {
      const book = a.source?.bookTitle;
      const level = a.level;
      if (!book || !level) return;
      if (!driftByBook[book]) driftByBook[book] = { publisher: a.source?.publisher || '', levels: {} };
      driftByBook[book].levels[level] = (driftByBook[book].levels[level] || 0) + 1;
    });
    const driftData = Object.entries(driftByBook)
      .map(([book, d]) => {
        const statedLevel = materialLevelMap[book] || '';
        const actualLevel = Object.entries(d.levels).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        const statedIdx = CEFR_ORDER.indexOf(statedLevel);
        const actualIdx = CEFR_ORDER.indexOf(actualLevel);
        let driftDir: 'down' | 'up' | 'aligned' | 'unknown' = 'unknown';
        let driftSteps = 0;
        if (statedIdx >= 0 && actualIdx >= 0) {
          driftSteps = actualIdx - statedIdx;
          if (driftSteps < 0) driftDir = 'down';
          else if (driftSteps > 0) driftDir = 'up';
          else driftDir = 'aligned';
        }
        return { book, publisher: d.publisher, statedLevel, actualLevel, driftDir, driftSteps };
      })
      .filter(b => b.statedLevel !== '' || b.actualLevel !== '')
      .sort((a, b) => Math.abs(b.driftSteps) - Math.abs(a.driftSteps));
    setCefrDriftData(driftData);

    // 4. UNIT PRESSURE MAP
    const unitCounts: Record<string, { book: string; count: number }> = {};
    filteredActivities.forEach((a: any) => {
      const book = a.source?.bookTitle || '';
      (a.source?.pages || []).forEach((p: any) => {
        (p.unitTags || []).forEach((u: string) => {
          const key = `${u}||${book}`;
          if (!unitCounts[key]) unitCounts[key] = { book, count: 0 };
          unitCounts[key].count++;
        });
      });
    });
    const upData = Object.entries(unitCounts)
      .map(([key, d]) => ({ unit: key.split('||')[0], book: d.book, count: d.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
    setUnitPressureData(upData);

    // 5. CONTENT LONGEVITY
    const now2 = new Date();
    const monthKeys = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now2.getFullYear(), now2.getMonth() - (5 - i), 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const bookMonthCounts: Record<string, { publisher: string; months: Record<string, number> }> = {};
    filteredActivities.forEach((a: any) => {
      const book = a.source?.bookTitle;
      if (!book) return;
      if (!bookMonthCounts[book]) bookMonthCounts[book] = { publisher: a.source?.publisher || '', months: {} };
      let date: Date | null = null;
      if (a.createdAt?.toDate) date = a.createdAt.toDate();
      else if (a.createdAt) date = new Date(a.createdAt);
      if (date) {
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthKeys.includes(key)) {
          bookMonthCounts[book].months[key] = (bookMonthCounts[book].months[key] || 0) + 1;
        }
      }
    });
    const longevityData = Object.entries(bookMonthCounts)
      .map(([book, d]) => {
        const counts = monthKeys.map(m => d.months[m] || 0);
        const prior = counts[1] + counts[2]; // months 2-3
        const recent = counts[4] + counts[5]; // months 5-6
        const total = counts.reduce((s, n) => s + n, 0);
        let trend: 'rising' | 'falling' | 'stable' | 'new' = 'stable';
        if (total <= 1) trend = 'new';
        else if (prior === 0 && recent > 0) trend = 'rising';
        else if (recent > prior * 1.3) trend = 'rising';
        else if (recent < prior * 0.7) trend = 'falling';
        return { book, publisher: d.publisher, trend, recentCount: recent, priorCount: prior };
      })
      .filter(b => b.recentCount + b.priorCount > 0)
      .sort((a, b) => b.recentCount - a.recentCount);
    setContentLongevityData(longevityData);

    // 6. DIGITAL READINESS
    const drByBook: Record<string, { publisher: string; total: number; interactive: number }> = {};
    filteredActivities.forEach((a: any) => {
      const book = a.source?.bookTitle;
      if (!book) return;
      if (!drByBook[book]) drByBook[book] = { publisher: a.source?.publisher || '', total: 0, interactive: 0 };
      drByBook[book].total++;
      if ((a.interactiveData?.questions?.length || 0) > 0) drByBook[book].interactive++;
    });
    const drData = Object.entries(drByBook)
      .map(([book, d]) => ({
        book,
        publisher: d.publisher,
        total: d.total,
        interactive: d.interactive,
        pct: d.total > 0 ? Math.round((d.interactive / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
    setDigitalReadinessData(drData);

  }, [allActivities, allMagicLinks, allMaterials, selectedPublisher, timeRange, users]);

  const ENHANCE_LABEL: Record<string, string> = {
    simplify: 'Simplified', increase_difficulty: 'Increased Difficulty',
    add_scaffolding: 'Added Scaffolding', add_lead_in: 'Added Lead-In',
    convert_pair_work: 'Pair Work', localise_context: 'Localised',
  };

  const TIME_RANGE_LABELS: Record<string, string> = {
    all: 'All Time', year: 'Last 12 Months', month: 'Last 30 Days', week: 'Last 7 Days', day: 'Last 24 Hours'
  };

  const fetchTokenUsage = async () => {
    setTokenUsageLoading(true);
    try {
      const month = new Date().toISOString().substring(0, 7);
      const snap = await db.collection('tokenUsage').where('month', '==', month).get();
      setTokenUsageLogs(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('fetchTokenUsage error:', err);
    } finally {
      setTokenUsageLoading(false);
    }
  };

  const fetchActionPlanLogs = async () => {
    setActionPlanLogsLoading(true);
    try {
      const snap = await db.collection('actionPlanLogs')
        .where('publisher', '==', selectedPublisher)
        .orderBy('generatedAt', 'desc')
        .limit(20)
        .get();
      setActionPlanLogs(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('fetchActionPlanLogs error:', err);
    } finally {
      setActionPlanLogsLoading(false);
    }
  };

  const stripMd = (s: string): string =>
    s.replace(/\*\*(.+?)\*\*/g, '$1')
     .replace(/\*(.+?)\*/g, '$1')
     .replace(/^#{1,6}\s+/gm, '')
     .replace(/`(.+?)`/g, '$1')
     .replace(/^\s*[-*]\s+/gm, '');

  const handleGenerateActionPlan = async () => {
    setActionPlanLoading(true);
    setShowActionPlan(true);
    setActionPlanTab('plan');
    setParsedActionPlan(null);
    try {
      const adapted = allActivities.filter((a: any) => a.enhancements?.length > 0);
      const enhCounts: Record<string, number> = {};
      adapted.forEach((a: any) => {
        (a.enhancements || []).forEach((e: string) => { enhCounts[e] = (enhCounts[e] || 0) + 1; });
      });
      const adaptationSummary = Object.entries(enhCounts)
        .map(([key, count]) => ({ key, label: ENHANCE_LABEL[key] || key, count }))
        .sort((a, b) => b.count - a.count);

      const payload = {
        selectedPublisher,
        timeRange,
        totalActivities: supplementationData.reduce((s, b) => s + b.count, 0),
        supplementationRanking: supplementationData,
        skillGapData,
        cefrDriftData,
        unitPressureTop: unitPressureData.slice(0, 8),
        contentLongevity: contentLongevityData,
        digitalReadiness: digitalReadinessData,
        adaptationSummary,
      };

      const res = await fetch('/.netlify/functions/ai-action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Log token usage for action-plan (admin-only operation)
      if (data.tokensUsed) {
        const adminUid = firebase.auth().currentUser?.uid;
        if (adminUid) await trackTokenUsage(adminUid, data.tokensUsed, 'action-plan');
      }

      // If server-side JSON.parse failed, data.overallBrief may contain the raw JSON string
      let resolved = data;
      if ((!data.bookBriefs || data.bookBriefs.length === 0) && typeof data.overallBrief === 'string') {
        const trimmed = data.overallBrief.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
          try {
            const candidate = trimmed.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
            resolved = JSON.parse(candidate);
          } catch {
            // keep original
          }
        }
      }

      const cleanPlan = {
        overallBrief: stripMd(resolved.overallBrief || ''),
        bookBriefs: (resolved.bookBriefs || []).map((b: any) => ({
          ...b,
          observation: stripMd(b.observation || ''),
          gap: stripMd(b.gap || ''),
          recommendation: stripMd(b.recommendation || ''),
        })),
        seasonalNote: stripMd(resolved.seasonalNote || ''),
      };

      setParsedActionPlan(cleanPlan);

      // Log to Firestore
      try {
        await db.collection('actionPlanLogs').add({
          generatedAt: new Date(),
          publisher: selectedPublisher,
          timeRange,
          overallBrief: cleanPlan.overallBrief,
          bookBriefs: cleanPlan.bookBriefs,
          seasonalNote: cleanPlan.seasonalNote,
          keyMetrics: {
            totalActivities: payload.totalActivities,
            topSkill: skillGapData[0]?.skill || '',
            topBook: supplementationData[0]?.book || '',
            risingBooks: contentLongevityData.filter(b => b.trend === 'rising').map(b => b.book),
            fallingBooks: contentLongevityData.filter(b => b.trend === 'falling').map(b => b.book),
          },
        });
        // Always refresh so the history tab is up to date
        fetchActionPlanLogs();
      } catch (logErr) {
        console.error('Failed to log action plan:', logErr);
      }
    } catch (err: any) {
      setParsedActionPlan({ overallBrief: `Generation failed: ${err.message}`, bookBriefs: [], seasonalNote: '' });
    } finally {
      setActionPlanLoading(false);
    }
  };

  const pendingUsers = users.filter(u => u.status === 'pending');

  const handleApprove = async (uid: string) => {
    await approveUserAccess(uid);
    toast.success("User Approved");
    fetchData();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen bg-gray-50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">ADMIN HUB <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded ml-2">(v2.0)</span></h1>
          <p className="text-gray-500 text-sm font-medium">PLATFORM INTELLIGENCE & OPERATIONS</p>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
          <button 
            onClick={() => setActiveTab('intelligence')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'intelligence' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> INTELLIGENCE
          </button>
          
          <button 
            onClick={() => { setActiveTab('governance'); fetchTokenUsage(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'governance' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-4 h-4" /> GOVERNANCE
          </button>

          <button 
            onClick={() => setActiveTab('approvals')}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'approvals' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <UserPlus className="w-4 h-4" /> APPROVALS
            {stats.pending > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-pulse">
                {stats.pending}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-2">
           <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
           </button>
           <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-xs font-bold uppercase tracking-wider transition-colors">
              MY PROFILE
           </button>
        </div>
      </div>

      {/* --- TAB CONTENT START --- */}

      {/* 1. INTELLIGENCE TAB (Stats Only) */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard icon={<Users className="w-6 h-6 text-blue-600" />} label="TOTAL USERS" value={stats.total} />
            <StatsCard icon={<CheckCircle className="w-6 h-6 text-green-600" />} label="ACTIVE USERS" value={stats.active} />
            <StatsCard icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} label="PENDING REVIEW" value={stats.pending} />
            <StatsCard icon={<Activity className="w-6 h-6 text-purple-600" />} label="CREDITS CONSUMED" value={stats.totalTokens.toLocaleString()} />
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-400" /> Content Ecosystem
            </h3>
            
            {intelligenceLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <StatsCard icon={<Globe className="w-6 h-6 text-indigo-600" />} label="PUBLISHERS TRACKED" value={intelligenceStats.publishers} />
                  <StatsCard icon={<BookOpen className="w-6 h-6 text-emerald-600" />} label="BOOKS IN SYSTEM" value={intelligenceStats.books} />
                  <StatsCard icon={<FileText className="w-6 h-6 text-amber-600" />} label="MATERIALS SAVED" value={intelligenceStats.materials} />
                  <StatsCard icon={<Layers className="w-6 h-6 text-rose-600" />} label="ACTIVITIES BRAIDED" value={intelligenceStats.activities} />
                </div>

                {/* PLATFORM GROWTH */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900">Platform Growth</h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">Activity creation over time</p>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthData}>
                        <defs>
                          <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF3D5A" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#EF3D5A" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                          cursor={{ stroke: '#EF3D5A', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Legend iconType="circle" />
                        <Area 
                          type="monotone" 
                          dataKey="activities" 
                          name="Activities Braided"
                          stroke="#EF3D5A" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorActivities)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="sessions" 
                          name="Sessions Delivered"
                          stroke="#10B981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorSessions)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GLOBAL FILTER BAR */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 space-y-3">
                  {/* Row 1: Publisher + Action Plan */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <LayoutGrid className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Analytics Filter</h3>
                        <p className="text-xs text-gray-500">Recalibrates all 6 insights + action plan</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="relative">
                        <select
                          value={selectedPublisher}
                          onChange={(e) => setSelectedPublisher(e.target.value)}
                          className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg text-sm font-bold focus:outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <option value="All Publishers">All Publishers</option>
                          {uniquePublishers.map(pub => (
                            <option key={pub} value={pub}>{pub}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                      </div>
                      <button
                        onClick={() => { setShowActionPlan(true); setActionPlanTab('history'); fetchActionPlanLogs(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> View History
                      </button>
                      <button
                        onClick={handleGenerateActionPlan}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Generate Action Plan
                      </button>
                    </div>
                  </div>
                  {/* Row 2: Time Range Pills */}
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100 flex-wrap">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Time Window:</span>
                    {(['all', 'year', 'month', 'week', 'day'] as const).map(tr => (
                      <button
                        key={tr}
                        onClick={() => setTimeRange(tr)}
                        className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${timeRange === tr ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {tr === 'all' ? 'All Time' : tr === 'year' ? '12 Months' : tr === 'month' ? '30 Days' : tr === 'week' ? '7 Days' : '24 Hours'}
                      </button>
                    ))}
                    {timeRange !== 'all' && (
                      <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full ml-1">
                        Filtered view — {TIME_RANGE_LABELS[timeRange]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900">Content Usage by Publisher</h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">Which publishers' materials are being used to braid activities</p>
                  </div>
                  
                  {publisherData.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-12">
                      {/* DONUT CHART */}
                      <div className="h-[300px] w-[300px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={publisherData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={110}
                              paddingAngle={5}
                              dataKey="count"
                            >
                              {publisherData.map((entry, index) => {
                                const color = entry.name === "Teacher's Own Materials" 
                                  ? '#9CA3AF' 
                                  : ['#EF3D5A', '#1F2937', '#10B981', '#F59E0B', '#6366F1', '#EC4899'][index % 6];
                                return <Cell key={`cell-${index}`} fill={color} />;
                              })}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                           <span className="text-3xl font-black text-gray-900">
                             {selectedPublisher === 'All Publishers' 
                               ? intelligenceStats.activities 
                               : publisherData.reduce((acc, curr) => acc + curr.count, 0)}
                           </span>
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activities</span>
                        </div>
                      </div>

                      {/* LEGEND & LIST */}
                      <div className="flex-1 w-full">
                        <div className="space-y-3">
                          {publisherData.map((entry, index) => {
                             const total = publisherData.reduce((acc, curr) => acc + curr.count, 0);
                             const percentage = Math.round((entry.count / total) * 100);
                             const color = entry.name === "Teacher's Own Materials" 
                               ? '#9CA3AF' 
                               : ['#EF3D5A', '#1F2937', '#10B981', '#F59E0B', '#6366F1', '#EC4899'][index % 6];
                             
                             return (
                               <div key={entry.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                 <div className="flex items-center gap-3">
                                   <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                                   <span className="text-sm font-bold text-gray-700">{entry.name}</span>
                                 </div>
                                 <div className="flex items-center gap-4">
                                   <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{percentage}%</span>
                                   <span className="text-sm font-mono font-bold text-gray-900 w-8 text-right">{entry.count}</span>
                                 </div>
                               </div>
                             );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      <p>No publisher data yet. Activities created from tagged source materials will appear here.</p>
                    </div>
                  )}
                </div>

                {/* BOOK INTELLIGENCE TABLE */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                  <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Book Intelligence</h3>
                      <p className="text-xs text-gray-400 font-medium mt-1">Deep dive into coursebook usage</p>
                    </div>
                  </div>

                  {/* SUMMARY CARD (Conditional) */}
                  {selectedPublisher !== 'All Publishers' && (
                    <div className="px-8 pt-6 pb-2">
                       <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">PUBLISHER SNAPSHOT</div>
                            <h4 className="text-lg font-black text-gray-900">{selectedPublisher}</h4>
                          </div>
                          <div className="flex gap-8 text-right">
                             <div>
                               <div className="text-2xl font-black text-gray-900 leading-none">
                                 {bookData.filter(b => b.publisher === selectedPublisher).length}
                               </div>
                               <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">Books</div>
                             </div>
                             <div>
                               <div className="text-2xl font-black text-gray-900 leading-none">
                                 {bookData.filter(b => b.publisher === selectedPublisher).reduce((acc, curr) => acc + curr.count, 0)}
                               </div>
                               <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">Activities</div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                  
                  {bookData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <tr>
                            <th className="px-8 py-4">Book Title</th>
                            <th className="px-8 py-4">Publisher</th>
                            <th className="px-8 py-4">Activities Braided</th>
                            <th className="px-8 py-4">Top Activity Type</th>
                            <th className="px-8 py-4">Top CEFR Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookData
                            .map((book, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="px-8 py-4 font-bold text-gray-900">{book.title}</td>
                              <td className="px-8 py-4 text-gray-500">{book.publisher}</td>
                              <td className="px-8 py-4 text-gray-500">{book.count}</td>
                              <td className="px-8 py-4 text-gray-500 capitalize">{book.topType}</td>
                              <td className="px-8 py-4 text-gray-500">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">{book.topCefr}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      <p>No book data yet.</p>
                    </div>
                  )}
                </div>

                {/* ══════════════════════════════════════════════════════════
                    MAGIC BALL — 6 INFERENCE INSIGHTS
                    ══════════════════════════════════════════════════════════ */}

                {/* SECTION HEADER */}
                <div className="mt-10 mb-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-900 text-white">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">Publisher Intelligence</h3>
                    <p className="text-xs text-gray-400">What the data means — not just what it counts</p>
                  </div>
                </div>

                {/* ROW A: Supplementation Pressure + Skill Gap (2-col) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">

                  {/* 1. SUPPLEMENTATION PRESSURE RANKING */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-rose-500" />
                      <h4 className="text-sm font-black text-gray-900">Supplementation Pressure</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-4">Which books require the most teacher effort to supplement</p>
                    {supplementationData.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No sourced activities yet</p>
                    ) : (
                      <div className="space-y-3">
                        {supplementationData.map((b, i) => (
                          <div key={b.book}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-300 w-4">{i + 1}</span>
                                <div>
                                  <span className="text-xs font-bold text-gray-800">{b.book}</span>
                                  <span className="text-[10px] text-gray-400 ml-1.5">{b.publisher}</span>
                                </div>
                              </div>
                              <span className="text-[11px] font-black text-gray-600">{b.count} <span className="font-normal text-gray-400">acts</span></span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${b.pressure}%` }} />
                            </div>
                            <div className="text-right text-[9px] text-gray-300 font-bold mt-0.5">{b.pressure}% of platform effort</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. SKILL GAP HEATMAP */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart2 className="w-4 h-4 text-violet-500" />
                      <h4 className="text-sm font-black text-gray-900">Skill Gap Heatmap</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-4">Where teachers compensate most = book's weakest skill coverage</p>
                    {skillGapData.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No skill data yet</p>
                    ) : (
                      <div className="space-y-2.5">
                        {skillGapData.map((s, i) => {
                          const intensity = i === 0 ? 'bg-violet-600' : i === 1 ? 'bg-violet-400' : i === 2 ? 'bg-violet-300' : 'bg-violet-100';
                          const textC = i <= 1 ? 'text-white' : 'text-violet-700';
                          return (
                            <div key={s.skill} className="flex items-center gap-3">
                              <div className="w-28 text-[11px] font-bold text-gray-700 truncate">{s.skill}</div>
                              <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                                <div className={`h-full ${intensity} flex items-center px-2 transition-all`} style={{ width: `${s.pct}%` }}>
                                  {s.pct > 15 && <span className={`text-[9px] font-black ${textC}`}>{s.pct}%</span>}
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-gray-500 w-6 text-right">{s.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ROW B: CEFR Drift + Unit Pressure (2-col) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

                  {/* 3. CEFR DRIFT INDICATOR */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="w-4 h-4 text-amber-500" />
                      <h4 className="text-sm font-black text-gray-900">CEFR Drift Indicator</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-4">Teachers creating activities below the book's stated level = difficulty gap</p>
                    {cefrDriftData.filter(b => b.statedLevel).length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-xs text-gray-400">Tag materials with CEFR levels to unlock drift analysis</p>
                        <p className="text-[10px] text-gray-300 mt-1">Requires book level data in Source Materials</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cefrDriftData.filter(b => b.statedLevel && b.actualLevel).slice(0, 6).map(b => (
                          <div key={b.book} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-gray-800 truncate">{b.book}</p>
                              <p className="text-[9px] text-gray-400">{b.publisher}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{b.statedLevel}</span>
                              <span className="text-gray-300">→</span>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${b.driftDir === 'down' ? 'bg-amber-100 text-amber-700' : b.driftDir === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{b.actualLevel}</span>
                              {b.driftDir === 'down' && <TrendingDown className="w-3.5 h-3.5 text-amber-500" />}
                              {b.driftDir === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                              {b.driftDir === 'aligned' && <Minus className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                          </div>
                        ))}
                        {cefrDriftData.filter(b => !b.statedLevel && b.actualLevel).length > 0 && (
                          <p className="text-[10px] text-gray-300 pt-2">{cefrDriftData.filter(b => !b.statedLevel).length} book(s) missing stated level — add in Source Materials to compare</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. UNIT PRESSURE MAP */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="w-4 h-4 text-teal-500" />
                      <h4 className="text-sm font-black text-gray-900">Unit Pressure Map</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-4">Units receiving the most supplementation = hardest or most insufficient content</p>
                    {unitPressureData.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-xs text-gray-400">No unit tag data yet</p>
                        <p className="text-[10px] text-gray-300 mt-1">Add unit tags to Source Materials to unlock this insight</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {unitPressureData.slice(0, 8).map((u, i) => {
                          const maxCount = unitPressureData[0].count;
                          const pct = maxCount > 0 ? Math.round((u.count / maxCount) * 100) : 0;
                          return (
                            <div key={`${u.unit}-${u.book}`} className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-gray-300 w-4">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[11px] font-bold text-gray-800 truncate">{u.unit}</span>
                                  <span className="text-[10px] font-mono text-gray-500 ml-2">{u.count}×</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[9px] text-gray-300 mt-0.5 truncate">{u.book}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ROW C: Content Longevity + Digital Readiness (2-col) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 mb-8">

                  {/* 6. CONTENT LONGEVITY */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-sm font-black text-gray-900">Content Longevity</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-4">Is this book being used more or less? Declining usage = risk of being dropped</p>
                    {contentLongevityData.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No longevity data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {contentLongevityData.slice(0, 7).map(b => (
                          <div key={b.book} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-gray-800 truncate">{b.book}</p>
                              <p className="text-[9px] text-gray-400">{b.recentCount} recent · {b.priorCount} prior</p>
                            </div>
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ml-3 ${b.trend === 'rising' ? 'bg-emerald-50 text-emerald-700' : b.trend === 'falling' ? 'bg-rose-50 text-rose-700' : b.trend === 'new' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                              {b.trend === 'rising' && <TrendingUp className="w-3 h-3" />}
                              {b.trend === 'falling' && <TrendingDown className="w-3 h-3" />}
                              {b.trend === 'stable' && <Minus className="w-3 h-3" />}
                              {b.trend === 'new' ? 'New' : b.trend.charAt(0).toUpperCase() + b.trend.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 7. DIGITAL READINESS */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Wifi className="w-4 h-4 text-blue-500" />
                      <h4 className="text-sm font-black text-gray-900">Digital Readiness</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-4">% of activities with interactive format — publishers can use this to pitch digital editions</p>
                    {digitalReadinessData.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No activities yet</p>
                    ) : (
                      <div className="space-y-3">
                        {digitalReadinessData.map(b => (
                          <div key={b.book}>
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <span className="text-[11px] font-bold text-gray-800">{b.book}</span>
                                <span className="text-[9px] text-gray-400 ml-1.5">{b.interactive}/{b.total} interactive</span>
                              </div>
                              <span className={`text-[11px] font-black ${b.pct >= 70 ? 'text-blue-600' : b.pct >= 40 ? 'text-amber-600' : 'text-gray-400'}`}>{b.pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${b.pct >= 70 ? 'bg-blue-500' : b.pct >= 40 ? 'bg-amber-400' : 'bg-gray-300'}`} style={{ width: `${b.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTION PLAN MODAL */}
                {showActionPlan && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

                      {/* Modal Header */}
                      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-900 rounded-xl">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-black text-gray-900 text-base">Action Plan</h3>
                            <p className="text-[11px] text-gray-400">
                              {selectedPublisher === 'All Publishers' ? 'Platform Intelligence Brief' : `${selectedPublisher} Publisher Brief`}
                              {timeRange !== 'all' && <span className="ml-1.5 text-amber-500">· {TIME_RANGE_LABELS[timeRange]}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Tab Switcher */}
                          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                            {(['plan', 'history', 'compare'] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => {
                                  setActionPlanTab(tab);
                                  if (tab === 'history' && actionPlanLogs.length === 0) fetchActionPlanLogs();
                                }}
                                className={`px-3 py-1.5 rounded-md font-bold capitalize transition-all ${actionPlanTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setShowActionPlan(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 ml-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* PLAN TAB */}
                      {actionPlanTab === 'plan' && (
                        <div className="flex-1 overflow-y-auto">
                          {actionPlanLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                              <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                              <p className="text-sm text-gray-400 font-medium">Analysing platform data…</p>
                              <p className="text-xs text-gray-300">Generating overall brief + per-book analysis</p>
                            </div>
                          ) : parsedActionPlan ? (
                            <div className="p-6 space-y-6">
                              {/* Overall Brief */}
                              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedPublisher === 'All Publishers' ? 'Overall Platform Brief' : 'Overall Publisher Brief'}</span>
                                </div>
                                {parsedActionPlan.overallBrief.split('\n').filter(p => p.trim()).map((para, i) => (
                                  <p key={i} className="text-sm text-gray-700 leading-relaxed mb-3 last:mb-0">{para}</p>
                                ))}
                              </div>

                              {/* Seasonal Note */}
                              {parsedActionPlan.seasonalNote && (
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                                  <div className="text-amber-500 mt-0.5">📅</div>
                                  <div>
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Academic Calendar Context</p>
                                    <p className="text-sm text-amber-800 leading-relaxed">{parsedActionPlan.seasonalNote}</p>
                                  </div>
                                </div>
                              )}

                              {/* Per-Book Briefs */}
                              {parsedActionPlan.bookBriefs.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Per-Book Analysis</p>
                                  <div className="space-y-4">
                                    {parsedActionPlan.bookBriefs.map((bb, i) => (
                                      <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
                                          <div>
                                            <p className="font-black text-sm">{bb.book}</p>
                                            <p className="text-[10px] text-gray-400">{bb.publisher}</p>
                                          </div>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                          <div className="p-4">
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">Observation</p>
                                            <p className="text-sm text-gray-700 leading-relaxed">{bb.observation}</p>
                                          </div>
                                          <div className="p-4 bg-red-50/40">
                                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5">Gap</p>
                                            <p className="text-sm text-gray-700 leading-relaxed">{bb.gap}</p>
                                          </div>
                                          <div className="p-4 bg-green-50/40">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Recommendation</p>
                                            <p className="text-sm text-gray-700 leading-relaxed">{bb.recommendation}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">No plan generated yet.</div>
                          )}
                        </div>
                      )}

                      {/* HISTORY TAB */}
                      {actionPlanTab === 'history' && (
                        <div className="flex-1 overflow-y-auto p-6">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Past Action Plans — {selectedPublisher}</p>
                            <p className="text-[10px] text-gray-400">Pin 2 plans to compare them side-by-side</p>
                          </div>
                          {actionPlanLogsLoading ? (
                            <div className="flex justify-center py-12">
                              <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                            </div>
                          ) : actionPlanLogs.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-sm">No plans logged yet. Generate your first plan.</div>
                          ) : (
                            <div className="space-y-3">
                              {actionPlanLogs.map((log, i) => {
                                const ts = log.generatedAt?.toDate ? log.generatedAt.toDate() : new Date(log.generatedAt);
                                const isCompareA = compareA?.id === log.id;
                                const isCompareB = compareB?.id === log.id;
                                return (
                                  <div key={log.id} className={`border rounded-xl p-4 transition-all ${isCompareA ? 'border-blue-400 bg-blue-50' : isCompareB ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-black text-gray-800">
                                            {ts.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            <span className="text-gray-400 font-normal ml-1">
                                              {ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          </span>
                                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">{log.timeRange || 'all'}</span>
                                          {isCompareA && <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] font-black">Plan A</span>}
                                          {isCompareB && <span className="px-2 py-0.5 bg-violet-500 text-white rounded text-[10px] font-black">Plan B</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2">{log.overallBrief?.split('\n')[0]?.slice(0, 120)}…</p>
                                        {log.keyMetrics && (
                                          <div className="flex gap-3 mt-2">
                                            {log.keyMetrics.topBook && <span className="text-[10px] text-gray-400">Top book: <strong>{log.keyMetrics.topBook}</strong></span>}
                                            {log.keyMetrics.topSkill && <span className="text-[10px] text-gray-400">Top skill: <strong>{log.keyMetrics.topSkill}</strong></span>}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col gap-1.5 min-w-fit">
                                        <button
                                          onClick={() => {
                                            let logData = { overallBrief: log.overallBrief || '', bookBriefs: log.bookBriefs || [], seasonalNote: log.seasonalNote || '' };
                                            if ((!logData.bookBriefs.length) && typeof logData.overallBrief === 'string') {
                                              const t = logData.overallBrief.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
                                              if (t.startsWith('{')) { try { logData = JSON.parse(t); } catch {} }
                                            }
                                            setParsedActionPlan({
                                              overallBrief: stripMd(logData.overallBrief || ''),
                                              bookBriefs: (logData.bookBriefs || []).map((b: any) => ({ ...b, observation: stripMd(b.observation || ''), gap: stripMd(b.gap || ''), recommendation: stripMd(b.recommendation || '') })),
                                              seasonalNote: stripMd(logData.seasonalNote || ''),
                                            });
                                            setActionPlanTab('plan');
                                          }}
                                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-bold"
                                        >View</button>
                                        <button
                                          onClick={() => {
                                            if (isCompareA) { setCompareA(null); }
                                            else if (isCompareB) { setCompareB(null); }
                                            else if (!compareA) { setCompareA(log); }
                                            else if (!compareB) { setCompareB(log); }
                                          }}
                                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${isCompareA ? 'bg-blue-500 text-white' : isCompareB ? 'bg-violet-500 text-white' : 'bg-gray-100 hover:bg-blue-100 text-gray-700'}`}
                                        >
                                          {isCompareA ? 'Plan A ✓' : isCompareB ? 'Plan B ✓' : 'Pin'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {compareA && compareB && (
                                <button
                                  onClick={() => setActionPlanTab('compare')}
                                  className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-black hover:bg-gray-700 transition-colors mt-2"
                                >
                                  Compare Plan A vs Plan B →
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* COMPARE TAB */}
                      {actionPlanTab === 'compare' && (
                        <div className="flex-1 overflow-y-auto p-6">
                          {(!compareA || !compareB) ? (
                            <div className="py-12 text-center text-gray-400 text-sm">
                              Pin two plans from the History tab to compare them.
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* Compare header */}
                              <div className="grid grid-cols-2 gap-4">
                                {[compareA, compareB].map((plan, idx) => {
                                  const ts = plan.generatedAt?.toDate ? plan.generatedAt.toDate() : new Date(plan.generatedAt);
                                  return (
                                    <div key={plan.id} className={`rounded-xl p-3 border ${idx === 0 ? 'border-blue-300 bg-blue-50' : 'border-violet-300 bg-violet-50'}`}>
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${idx === 0 ? 'text-blue-600' : 'text-violet-600'}`}>Plan {idx === 0 ? 'A' : 'B'}</span>
                                      <p className="text-xs font-bold text-gray-800 mt-0.5">
                                        {ts.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                      <p className="text-[10px] text-gray-500 mt-0.5">{plan.timeRange || 'All time'} window</p>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Overall comparison */}
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Overall Brief Comparison</p>
                                <div className="grid grid-cols-2 gap-4">
                                  {[compareA, compareB].map((plan, idx) => (
                                    <div key={plan.id} className={`rounded-xl p-4 border text-sm text-gray-700 leading-relaxed ${idx === 0 ? 'border-blue-200 bg-blue-50/50' : 'border-violet-200 bg-violet-50/50'}`}>
                                      {(() => {
                                        let brief = plan.overallBrief || '';
                                        const t = brief.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
                                        if (t.startsWith('{')) { try { brief = JSON.parse(t).overallBrief || brief; } catch {} }
                                        return stripMd(brief).split('\n').filter((p: string) => p.trim()).map((para: string, i: number) => (
                                          <p key={i} className="mb-3 last:mb-0">{para}</p>
                                        ));
                                      })()}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Per-book comparison */}
                              {(() => {
                                const allBooks = Array.from(new Set([
                                  ...(compareA.bookBriefs || []).map((b: any) => b.book),
                                  ...(compareB.bookBriefs || []).map((b: any) => b.book),
                                ]));
                                return allBooks.length > 0 ? (
                                  <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Per-Book Comparison</p>
                                    <div className="space-y-4">
                                      {allBooks.map(book => {
                                        const bA = compareA.bookBriefs?.find((b: any) => b.book === book);
                                        const bB = compareB.bookBriefs?.find((b: any) => b.book === book);
                                        return (
                                          <div key={book} className="border border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-gray-900 text-white px-4 py-2.5">
                                              <p className="font-black text-sm">{book}</p>
                                            </div>
                                            {(['observation', 'gap', 'recommendation'] as const).map(field => (
                                              <div key={field} className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                                                <div className="p-3">
                                                  <p className="text-[9px] font-black text-gray-400 uppercase mb-1">{field} · Plan A</p>
                                                  <p className="text-xs text-gray-600 leading-relaxed">{bA?.[field] ? stripMd(bA[field]) : <span className="italic text-gray-300">Not in this plan</span>}</p>
                                                </div>
                                                <div className="p-3">
                                                  <p className="text-[9px] font-black text-gray-400 uppercase mb-1">{field} · Plan B</p>
                                                  <p className="text-xs text-gray-600 leading-relaxed">{bB?.[field] ? stripMd(bB[field]) : <span className="italic text-gray-300">Not in this plan</span>}</p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null;
                              })()}

                              {/* Diff Summary Note */}
                              {(() => {
                                const tsA = compareA.generatedAt?.toDate ? compareA.generatedAt.toDate() : new Date(compareA.generatedAt);
                                const tsB = compareB.generatedAt?.toDate ? compareB.generatedAt.toDate() : new Date(compareB.generatedAt);
                                const sameTimeRange = compareA.timeRange === compareB.timeRange;
                                const topBookA = compareA.keyMetrics?.topBook || compareA.bookBriefs?.[0]?.book || '—';
                                const topBookB = compareB.keyMetrics?.topBook || compareB.bookBriefs?.[0]?.book || '—';
                                const topSkillA = compareA.keyMetrics?.topSkill || '—';
                                const topSkillB = compareB.keyMetrics?.topSkill || '—';
                                const totalA = compareA.keyMetrics?.totalActivities ?? '—';
                                const totalB = compareB.keyMetrics?.totalActivities ?? '—';
                                const booksA = new Set((compareA.bookBriefs || []).map((b: any) => b.book));
                                const booksB = new Set((compareB.bookBriefs || []).map((b: any) => b.book));
                                const newBooks = [...booksB].filter(b => !booksA.has(b));
                                const droppedBooks = [...booksA].filter(b => !booksB.has(b));
                                return (
                                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Comparison Summary</p>
                                    <ul className="text-xs text-amber-900 space-y-1.5 leading-relaxed">
                                      <li>Plan A was generated {tsA.toLocaleDateString()} · Plan B was generated {tsB.toLocaleDateString()}</li>
                                      {!sameTimeRange && <li>Time windows differ — Plan A used <strong>{compareA.timeRange || 'all'}</strong>, Plan B used <strong>{compareB.timeRange || 'all'}</strong>. Data ranges are not directly comparable.</li>}
                                      {typeof totalA === 'number' && typeof totalB === 'number' && totalA !== totalB && (
                                        <li>Activity volume changed from <strong>{totalA}</strong> (Plan A) to <strong>{totalB}</strong> (Plan B) — a {totalB > totalA ? `+${totalB - totalA} increase` : `${totalB - totalA} decrease`}.</li>
                                      )}
                                      {topBookA !== topBookB ? <li>Priority book shifted from <strong>{topBookA}</strong> (Plan A) to <strong>{topBookB}</strong> (Plan B).</li> : <li>Priority book is consistent: <strong>{topBookA}</strong> in both plans.</li>}
                                      {topSkillA !== topSkillB && topSkillA !== '—' && topSkillB !== '—' && <li>Top skill gap shifted from <strong>{topSkillA}</strong> to <strong>{topSkillB}</strong>.</li>}
                                      {newBooks.length > 0 && <li>New books in Plan B not in Plan A: <strong>{newBooks.join(', ')}</strong>.</li>}
                                      {droppedBooks.length > 0 && <li>Books in Plan A no longer flagged in Plan B: <strong>{droppedBooks.join(', ')}</strong>.</li>}
                                    </ul>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Modal Footer */}
                      <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                        <p className="text-[10px] text-gray-300">Generated by BraidStudio Intelligence</p>
                        <div className="flex items-center gap-2">
                          {actionPlanTab === 'plan' && !actionPlanLoading && parsedActionPlan && (
                            <>
                              <button
                                onClick={() => {
                                  const text = [
                                    `ACTION PLAN — ${selectedPublisher}`,
                                    `Generated: ${new Date().toLocaleDateString()}`,
                                    '',
                                    '── OVERALL BRIEF ──',
                                    parsedActionPlan.overallBrief,
                                    '',
                                    parsedActionPlan.seasonalNote ? `── SEASONAL NOTE ──\n${parsedActionPlan.seasonalNote}` : '',
                                    '',
                                    ...(parsedActionPlan.bookBriefs || []).flatMap(b => [
                                      `── ${b.book.toUpperCase()} ──`,
                                      `Observation: ${b.observation}`,
                                      `Gap: ${b.gap}`,
                                      `Recommendation: ${b.recommendation}`,
                                      '',
                                    ]),
                                  ].filter(l => l !== undefined).join('\n');
                                  navigator.clipboard.writeText(text).then(() => toast.success('Plan copied to clipboard'));
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-colors"
                              >
                                Copy
                              </button>
                              <button
                                onClick={handleGenerateActionPlan}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" /> Regenerate
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ADAPTATION SIGNALS */}
                {(() => {
                  const adapted = allActivities.filter((a: any) => a.enhancements?.length > 0);

                  const LABEL: Record<string, string> = {
                    simplify: 'Simplified',
                    increase_difficulty: 'Increased Difficulty',
                    add_scaffolding: 'Added Scaffolding',
                    add_lead_in: 'Added Lead-In',
                    convert_pair_work: 'Pair Work',
                    localise_context: 'Localised',
                  };
                  const COLOUR: Record<string, string> = {
                    simplify: 'bg-blue-100 text-blue-700',
                    increase_difficulty: 'bg-orange-100 text-orange-700',
                    add_scaffolding: 'bg-purple-100 text-purple-700',
                    add_lead_in: 'bg-green-100 text-green-700',
                    convert_pair_work: 'bg-teal-100 text-teal-700',
                    localise_context: 'bg-amber-100 text-amber-700',
                  };

                  // Count each enhancement type across all adapted activities
                  const enhancementCounts: Record<string, number> = {};
                  adapted.forEach((a: any) => {
                    (a.enhancements || []).forEach((e: string) => {
                      enhancementCounts[e] = (enhancementCounts[e] || 0) + 1;
                    });
                  });

                  // Per-book breakdown with richer source data
                  type BookSignal = {
                    publisher: string;
                    enhancements: Record<string, number>;
                    levels: Record<string, number>;
                    unitTags: Record<string, number>;
                    topics: Record<string, number>;
                    grammarPoints: Record<string, number>;
                    activityCount: number;
                  };
                  const bookSignals: Record<string, BookSignal> = {};
                  adapted.forEach((a: any) => {
                    const book = a.source?.bookTitle || 'Custom / No Book';
                    if (!bookSignals[book]) bookSignals[book] = {
                      publisher: a.source?.publisher || '',
                      enhancements: {},
                      levels: {},
                      unitTags: {},
                      topics: {},
                      grammarPoints: {},
                      activityCount: 0,
                    };
                    const sig = bookSignals[book];
                    sig.activityCount++;
                    // Enhancement types
                    (a.enhancements || []).forEach((e: string) => {
                      sig.enhancements[e] = (sig.enhancements[e] || 0) + 1;
                    });
                    // CEFR level
                    if (a.level) sig.levels[a.level] = (sig.levels[a.level] || 0) + 1;
                    // Unit tags from source pages
                    (a.source?.pages || []).forEach((p: any) => {
                      (p.unitTags || []).forEach((u: string) => {
                        sig.unitTags[u] = (sig.unitTags[u] || 0) + 1;
                      });
                    });
                    // Topic
                    if (a.topic) sig.topics[a.topic] = (sig.topics[a.topic] || 0) + 1;
                    // Grammar points from contentPool
                    (a.contentPool?.grammar || []).forEach((g: string) => {
                      sig.grammarPoints[g] = (sig.grammarPoints[g] || 0) + 1;
                    });
                  });

                  // Level distribution across ALL adapted activities
                  const levelCounts: Record<string, number> = {};
                  adapted.forEach((a: any) => {
                    if (a.level) levelCounts[a.level] = (levelCounts[a.level] || 0) + 1;
                  });
                  const CEFR_ORDER = ['A1','A2','B1','B2','C1','C2'];

                  // Top unit tags globally
                  const globalUnitTags: Record<string, number> = {};
                  adapted.forEach((a: any) => {
                    (a.source?.pages || []).forEach((p: any) => {
                      (p.unitTags || []).forEach((u: string) => {
                        globalUnitTags[u] = (globalUnitTags[u] || 0) + 1;
                      });
                    });
                  });
                  const topUnitTags = Object.entries(globalUnitTags).sort((a,b) => b[1]-a[1]).slice(0, 8);

                  // Top grammar points globally
                  const globalGrammar: Record<string, number> = {};
                  adapted.forEach((a: any) => {
                    (a.contentPool?.grammar || []).forEach((g: string) => {
                      globalGrammar[g] = (globalGrammar[g] || 0) + 1;
                    });
                  });
                  const topGrammar = Object.entries(globalGrammar).sort((a,b) => b[1]-a[1]).slice(0, 6);

                  const topBooks = Object.entries(bookSignals)
                    .sort((a, b) => Object.values(b[1].enhancements).reduce((s, n) => s + n, 0) - Object.values(a[1].enhancements).reduce((s, n) => s + n, 0))
                    .slice(0, 6);

                  return (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mt-8">
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Adaptation Signals</h3>
                        <p className="text-xs text-gray-400 font-medium mt-1">Where teachers are modifying content — reveals gaps in the original material</p>
                      </div>

                      {adapted.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-gray-200 rounded-xl">
                          <p className="text-sm font-bold text-gray-400">No adaptations recorded yet.</p>
                          <p className="text-xs text-gray-300 mt-1">Data will appear here as teachers use the Enhance menu in the Workbench.</p>
                        </div>
                      ) : (
                        <>
                          {/* ROW 1: What teachers are changing */}
                          <div className="mb-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">What teachers are changing</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(enhancementCounts).sort((a,b) => b[1]-a[1]).map(([key, count]) => (
                                <span key={key} className={`px-3 py-1.5 rounded-full text-[11px] font-black ${COLOUR[key] || 'bg-gray-100 text-gray-600'}`}>
                                  {LABEL[key] || key} — {count}×
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* ROW 2: CEFR level pills */}
                          {Object.keys(levelCounts).length > 0 && (
                            <div className="mb-6 pt-5 border-t border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">At which level</p>
                              <div className="flex flex-wrap gap-2">
                                {CEFR_ORDER.filter(lvl => levelCounts[lvl] > 0).map(lvl => (
                                  <span key={lvl} className="inline-flex items-center gap-2 px-3 py-1.5 bg-coral/10 text-coral rounded-full text-[11px] font-black">
                                    {lvl}
                                    <span className="bg-coral text-white rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none">{levelCounts[lvl]}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ROW 3: Unit tags + Grammar hotspots */}
                          {(topUnitTags.length > 0 || topGrammar.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 pt-5 border-t border-gray-100">
                              {topUnitTags.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Units most often adapted</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {topUnitTags.map(([tag, count]) => (
                                      <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold">
                                        {tag} <span className="text-gray-400 ml-1">{count}×</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {topGrammar.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Grammar points requiring support</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {topGrammar.map(([g, count]) => (
                                      <span key={g} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold">
                                        {g} <span className="text-amber-400 ml-1">{count}×</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ROW 4: Per-book breakdown table */}
                          {topBooks.length > 0 && (
                            <div className="pt-5 border-t border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">By book</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100">
                                      <th className="py-2 pr-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Book</th>
                                      <th className="py-2 px-3 font-black text-gray-400 uppercase tracking-widest text-[10px] text-center">Activities</th>
                                      <th className="py-2 px-3 font-black text-gray-400 uppercase tracking-widest text-[10px]">Levels</th>
                                      <th className="py-2 px-3 font-black text-gray-400 uppercase tracking-widest text-[10px]">Top Units</th>
                                      {Object.keys(enhancementCounts).map(k => (
                                        <th key={k} className="py-2 px-2 font-black text-gray-400 uppercase tracking-widest text-[10px] text-center whitespace-nowrap">{LABEL[k] || k}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {topBooks.map(([book, sig]) => {
                                      const topLevels = Object.entries(sig.levels).sort((a,b) => b[1]-a[1]).slice(0,3).map(([l]) => l).join(', ');
                                      const topUnits = Object.entries(sig.unitTags).sort((a,b) => b[1]-a[1]).slice(0,2).map(([u]) => u).join(', ');
                                      return (
                                        <tr key={book} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                                          <td className="py-3 pr-4">
                                            <p className="font-bold text-gray-800 text-[11px]">{book}</p>
                                            {sig.publisher && <p className="text-[9px] text-gray-400 font-bold uppercase">{sig.publisher}</p>}
                                          </td>
                                          <td className="py-3 px-3 text-center font-black text-gray-700">{sig.activityCount}</td>
                                          <td className="py-3 px-3 text-[10px] text-gray-500 font-bold">{topLevels || '—'}</td>
                                          <td className="py-3 px-3 text-[10px] text-gray-500 font-bold max-w-[120px] truncate">{topUnits || '—'}</td>
                                          {Object.keys(enhancementCounts).map(k => (
                                            <td key={k} className="py-3 px-2 text-center">
                                              {sig.enhancements[k] ? (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${COLOUR[k] || 'bg-gray-100 text-gray-600'}`}>{sig.enhancements[k]}</span>
                                              ) : (
                                                <span className="text-gray-200">—</span>
                                              )}
                                            </td>
                                          ))}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                  {/* HOW CONTENT IS TAUGHT SECTION */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mt-8">
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900">How Content is Taught</h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">Skills focus and delivery methods</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* LEFT CHART: SKILLS FOCUS */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-6 uppercase tracking-wider text-center">Skills Focus</h4>
                      {skillsData.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <div className="h-[250px] w-[250px] relative mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={skillsData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="count"
                                >
                                  {skillsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#EF3D5A', '#1F2937', '#10B981', '#F59E0B', '#6366F1', '#EC4899'][index % 6]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-2xl font-black text-gray-900">{skillsData.reduce((a, b) => a + b.count, 0)}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                            </div>
                          </div>
                          <div className="w-full space-y-2">
                            {skillsData.map((entry, index) => {
                              const total = skillsData.reduce((acc, curr) => acc + curr.count, 0);
                              const percentage = Math.round((entry.count / total) * 100);
                              const color = ['#EF3D5A', '#1F2937', '#10B981', '#F59E0B', '#6366F1', '#EC4899'][index % 6];
                              return (
                                <div key={entry.name} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="font-bold text-gray-700 capitalize">{entry.name.replace(/_/g, ' ')}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-400">{percentage}%</span>
                                    <span className="font-mono text-gray-900">{entry.count}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-gray-400 text-xs">No skills data available</div>
                      )}
                    </div>

                    {/* RIGHT CHART: ACTIVITY FORMATS */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-6 uppercase tracking-wider text-center">Activity Formats</h4>
                      {formatData.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <div className="h-[250px] w-[250px] relative mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={formatData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="count"
                                >
                                  {formatData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#1F2937', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#EF3D5A'][index % 6]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-2xl font-black text-gray-900">{formatData.reduce((a, b) => a + b.count, 0)}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                            </div>
                          </div>
                          <div className="w-full space-y-2">
                            {formatData.map((entry, index) => {
                              const total = formatData.reduce((acc, curr) => acc + curr.count, 0);
                              const percentage = Math.round((entry.count / total) * 100);
                              const color = ['#1F2937', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#EF3D5A'][index % 6];
                              return (
                                <div key={entry.name} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="font-bold text-gray-700 capitalize">{entry.name.replace(/_/g, ' ')}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-400">{percentage}%</span>
                                    <span className="font-mono text-gray-900">{entry.count}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-gray-400 text-xs">No format data available</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CEFR LEVEL DISTRIBUTION */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mt-8">
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900">CEFR Level Distribution</h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">What levels are teachers teaching most</p>
                  </div>

                  {cefrData.some(d => d.count > 0) ? (
                    <>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={cefrData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} 
                              dy={10}
                            />
                            <YAxis 
                              hide 
                            />
                            <Tooltip 
                              cursor={{ fill: '#F9FAFB' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar 
                              dataKey="count" 
                              fill="#EF3D5A" 
                              radius={[4, 4, 0, 0]} 
                              barSize={40}
                            >
                              <LabelList dataKey="count" position="top" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-600">
                          Most taught level: <span className="font-bold text-gray-900">
                            {(() => {
                              const max = Math.max(...cefrData.map(d => d.count));
                              const topLevel = cefrData.find(d => d.count === max);
                              return topLevel && max > 0 ? `${topLevel.name} (${topLevel.count} activities)` : 'N/A';
                            })()}
                          </span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      <p>No CEFR level data available.</p>
                    </div>
                  )}
                </div>

                  {/* TEACHING METHODOLOGY MAP */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mt-8">
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900">Teaching Methodology Map</h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">How each publisher's content is being taught</p>
                  </div>
                  
                  {Object.keys(methodologyData).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr>
                            <th className="p-3 bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 sticky left-0 z-10 min-w-[150px]">Publisher</th>
                            {activityTypes.map(type => (
                              <th key={type} className="p-3 bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center whitespace-nowrap">
                                {type.replace(/_/g, ' ')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Rows */}
                          {(() => {
                            const publishersToShow = selectedPublisher === 'All Publishers' 
                              ? Object.keys(methodologyData).sort() 
                              : [selectedPublisher];
                            
                            return publishersToShow.map(pub => (
                              <tr key={pub}>
                                <td className="p-3 border border-gray-100 font-bold text-gray-900 text-xs sticky left-0 bg-white z-10">{pub}</td>
                                {activityTypes.map(type => {
                                  const count = methodologyData[pub]?.[type] || 0;
                                  let bgClass = 'bg-white';
                                  let textClass = 'text-gray-500';
                                  
                                  if (count >= 6) {
                                    bgClass = 'bg-[#EF3D5A]';
                                    textClass = 'text-white font-bold';
                                  } else if (count >= 3) {
                                    bgClass = 'bg-[#F9A8B8]';
                                    textClass = 'text-gray-900 font-bold';
                                  } else if (count >= 1) {
                                    bgClass = 'bg-[#FEE2E6]';
                                    textClass = 'text-gray-900';
                                  }
                                  
                                  return (
                                    <td key={type} className={`p-3 border border-gray-100 text-center text-xs ${bgClass} ${textClass}`}>
                                      {count}
                                    </td>
                                  );
                                })}
                              </tr>
                            ));
                          })()}
                          
                          {/* Platform Average Row (Only if specific publisher selected) */}
                          {selectedPublisher !== 'All Publishers' && (
                            <tr>
                              <td className="p-3 border border-gray-100 font-bold text-gray-900 text-xs sticky left-0 bg-blue-50 z-10">Platform Average</td>
                              {activityTypes.map(type => {
                                // Calculate average: Total count of this type / Number of publishers
                                const totalCount = Object.values(methodologyData).reduce((acc, pubData) => acc + (pubData[type] || 0), 0);
                                const numPublishers = Object.keys(methodologyData).length;
                                const avg = numPublishers > 0 ? (totalCount / numPublishers).toFixed(1) : '0.0';
                                
                                return (
                                  <td key={type} className="p-3 border border-gray-100 text-center text-xs bg-blue-50 text-gray-600 font-mono">
                                    {avg}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      <p>No methodology data available.</p>
                    </div>
                  )}
                </div>

                {/* TEACHER ENGAGEMENT */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mt-8">
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900">Teacher Engagement</h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">Platform adoption and usage patterns</p>
                  </div>

                  {teacherData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <tr>
                            <th className="px-6 py-4">Teacher</th>
                            <th className="px-6 py-4">Activities Braided</th>
                            <th className="px-6 py-4">Last Active</th>
                            <th className="px-6 py-4">Top Publisher</th>
                            <th className="px-6 py-4">Top Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacherData.map((teacher, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teacher.statusColor }} />
                                  <div>
                                    <div className="font-bold text-gray-900">{teacher.name}</div>
                                    <div className="text-xs text-gray-400 font-mono">{teacher.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-mono text-gray-600 font-bold">{teacher.count}</td>
                              <td className="px-6 py-4 text-gray-500">
                                {teacher.lastActive.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="px-6 py-4 text-gray-500">{teacher.topPublisher}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">{teacher.topCefr}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      <p>No teacher data available.</p>
                    </div>
                  )}
                </div>

              </>
            )}
          </div>
        </div>
      )}

      {/* 2. GOVERNANCE TAB (User Table) */}
      {activeTab === 'governance' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* PLATFORM TOKEN OVERVIEW */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Platform Token Overview</h3>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} · Real cost tracking by model &amp; operation
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchTokenUsage} className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500">
                  <RefreshCw className={`w-3.5 h-3.5 ${tokenUsageLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 border border-[#EF3D5A] text-[#EF3D5A] rounded-lg hover:bg-[#EF3D5A] hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Reset All Usage
                </button>
              </div>
            </div>

            {(() => {
              const BUDGET = 50; // €50/month hard limit
              const totalCost = tokenUsageLogs.reduce((s, l) => s + (l.costEUR || 0), 0);
              const totalTokens = tokenUsageLogs.reduce((s, l) => s + (l.totalTokens || 0), 0);
              const budgetPct = Math.min((totalCost / BUDGET) * 100, 100);
              const remaining = BUDGET - totalCost;

              // Group by operation
              const byOp: Record<string, { tokens: number; cost: number; calls: number }> = {};
              tokenUsageLogs.forEach(l => {
                const op = l.operation || 'unknown';
                if (!byOp[op]) byOp[op] = { tokens: 0, cost: 0, calls: 0 };
                byOp[op].tokens += l.totalTokens || 0;
                byOp[op].cost += l.costEUR || 0;
                byOp[op].calls += 1;
              });

              // Group by user
              const byUser: Record<string, { tokens: number; cost: number; calls: number }> = {};
              tokenUsageLogs.forEach(l => {
                const uid = l.userId || 'unknown';
                if (!byUser[uid]) byUser[uid] = { tokens: 0, cost: 0, calls: 0 };
                byUser[uid].tokens += l.totalTokens || 0;
                byUser[uid].cost += l.costEUR || 0;
                byUser[uid].calls += 1;
              });
              const activeUserCount = Object.keys(byUser).length;
              const avgCostPerUser = activeUserCount > 0 ? totalCost / activeUserCount : 0;
              const maxFreeUsers = freeTierBudget > 0 ? Math.floor(BUDGET / freeTierBudget) : 0;

              const OP_LABELS: Record<string, string> = {
                ocr: 'OCR', extraction: 'Page Read', drafting: 'Draft', enhance: 'Enhance',
                conversion: 'Interactive', 'action-plan': 'Action Plan',
              };
              const OP_COLORS: Record<string, string> = {
                ocr: '#6366f1', extraction: '#8b5cf6', drafting: '#EF3D5A',
                enhance: '#f59e0b', conversion: '#10b981', 'action-plan': '#3b82f6',
              };

              return (
                <div className="space-y-6">
                  {/* Row 1 — Key metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Monthly Budget', value: `€${BUDGET}`, sub: 'hard limit' },
                      { label: 'Spent This Month', value: `€${totalCost.toFixed(4)}`, sub: `${totalTokens.toLocaleString()} tokens`, color: totalCost > BUDGET * 0.8 ? 'text-[#EF3D5A]' : 'text-gray-900' },
                      { label: 'Remaining', value: `€${remaining.toFixed(4)}`, sub: `${(100 - budgetPct).toFixed(1)}% left`, color: remaining < BUDGET * 0.2 ? 'text-[#EF3D5A]' : remaining < BUDGET * 0.5 ? 'text-amber-500' : 'text-green-600' },
                      { label: 'Active Users', value: activeUserCount, sub: `avg €${avgCostPerUser.toFixed(4)}/user` },
                    ].map(m => (
                      <div key={m.label} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{m.label}</div>
                        <div className={`text-2xl font-black ${(m as any).color || 'text-gray-900'}`}>{m.value}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{m.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Budget progress bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      <span>Budget consumed</span>
                      <span>{budgetPct.toFixed(2)}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${budgetPct > 80 ? 'bg-[#EF3D5A]' : budgetPct > 50 ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Cost by operation */}
                  {Object.keys(byOp).length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Cost by Operation</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(byOp).sort((a, b) => b[1].cost - a[1].cost).map(([op, stats]) => (
                          <div key={op} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: OP_COLORS[op] || '#9ca3af' }} />
                            <div className="min-w-0">
                              <div className="text-xs font-black text-gray-700">{OP_LABELS[op] || op}</div>
                              <div className="text-[10px] text-gray-400">{stats.calls} calls · {stats.tokens.toLocaleString()} tokens</div>
                              <div className="text-[10px] font-bold text-gray-600">€{stats.cost.toFixed(5)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-user cost table */}
                  {Object.keys(byUser).length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Cost by User This Month</p>
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="px-4 py-3">User</th>
                              <th className="px-4 py-3">API Calls</th>
                              <th className="px-4 py-3">Tokens</th>
                              <th className="px-4 py-3">Cost (€)</th>
                              <th className="px-4 py-3">% of Budget</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {Object.entries(byUser).sort((a, b) => b[1].cost - a[1].cost).map(([uid, stats]) => {
                              const userRecord = users.find(u => u.uid === uid);
                              const pct = BUDGET > 0 ? (stats.cost / BUDGET) * 100 : 0;
                              return (
                                <tr key={uid} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-gray-700 truncate max-w-[160px]">{userRecord?.email || uid.substring(0, 8) + '…'}</td>
                                  <td className="px-4 py-3 text-gray-500">{stats.calls}</td>
                                  <td className="px-4 py-3 text-gray-500">{stats.tokens.toLocaleString()}</td>
                                  <td className="px-4 py-3 font-bold text-gray-800">€{stats.cost.toFixed(5)}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#EF3D5A] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                                      </div>
                                      <span className="text-[10px] text-gray-400 w-10 text-right">{pct.toFixed(1)}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Free Tier Simulator */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Free Tier Simulator</p>
                    <p className="text-xs text-blue-700 mb-4">Set your target cost per free user per month to see how many users your €{BUDGET} budget can support.</p>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 block">
                          Free tier budget per user: €{freeTierBudget.toFixed(2)}/month
                        </label>
                        <input
                          type="range" min="0.01" max="5" step="0.01"
                          value={freeTierBudget}
                          onChange={e => setFreeTierBudget(parseFloat(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-blue-400 mt-0.5">
                          <span>€0.01</span><span>€5.00</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="text-center p-4 bg-white border border-blue-200 rounded-xl min-w-[100px]">
                          <div className="text-3xl font-black text-blue-700">{maxFreeUsers}</div>
                          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Max Free Users</div>
                        </div>
                        {avgCostPerUser > 0 && (
                          <div className="text-center p-4 bg-white border border-blue-200 rounded-xl min-w-[100px]">
                            <div className="text-3xl font-black text-blue-700">{Math.floor(BUDGET / avgCostPerUser)}</div>
                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">At Current Usage</div>
                          </div>
                        )}
                      </div>
                    </div>
                    {avgCostPerUser > 0 && (
                      <p className="text-xs text-blue-600 mt-3 font-medium">
                        Current avg cost per active user this month: <strong>€{avgCostPerUser.toFixed(5)}</strong>.
                        At this rate your €{BUDGET} budget supports <strong>{Math.floor(BUDGET / avgCostPerUser)} users</strong>.
                      </p>
                    )}
                    <p className="text-[10px] text-blue-400 mt-2">
                      Pricing: mistral-small €0.09/1M input · €0.28/1M output — mistral-medium €0.40/1M input · €2.00/1M output
                    </p>
                  </div>

                  {tokenUsageLogs.length === 0 && !tokenUsageLoading && (
                    <p className="text-sm text-gray-400 text-center py-4">No usage logged this month yet. Data appears here after the first AI operation.</p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* User Database Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" /> User Database
            </h2>
            <span className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold">
              {users.length} Records
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Identity</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Credit Usage</th>
                  <th className="px-6 py-4">Member Since</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const unlimited = isUnlimited(user);
                  return (
                    <tr 
                      key={user.uid} 
                      onClick={() => setSelectedUser(user)} 
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ backgroundColor: user.avatarColor || '#EF3D5A' }}>
                            {user.displayName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              {user.displayName}
                              {unlimited && <span className="text-[10px] bg-yellow-400 text-white px-1.5 py-0.5 rounded font-bold shadow-sm">VIP</span>}
                            </div>
                            <div className="text-gray-400 text-xs font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wide border border-gray-200">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600">
                        {unlimited ? (
                          <div className="flex items-center gap-1 text-green-600 bg-green-50 w-fit px-2 py-1 rounded border border-green-100">
                            <InfinityIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase">Unlimited</span>
                          </div>
                        ) : (
                          <div className="w-32">
                            <div className="flex justify-between text-[10px] mb-1 font-bold uppercase text-gray-400">
                              <span>{user.totalTokensUsed?.toLocaleString() || 0}</span>
                              <span>{(50000 + (user.bonusTokens || 0)).toLocaleString()} Limit</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${user.totalTokensUsed > (50000 + (user.bonusTokens || 0)) * 0.8 ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(((user.totalTokensUsed || 0) / (50000 + (user.bonusTokens || 0))) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs font-medium">
                        {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className="text-gray-300 group-hover:text-blue-600 transition-colors text-[10px] font-bold uppercase tracking-wider">Manage →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {/* 3. APPROVALS TAB (Pending Users) */}
      {activeTab === 'approvals' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            {pendingUsers.length === 0 ? (
              <div className="py-12">
                <CheckCircle className="w-16 h-16 text-green-100 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
                <p className="text-gray-500">There are no users waiting for approval.</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-lg font-bold text-gray-900 text-left mb-4">Pending Requests ({pendingUsers.length})</h3>
                {pendingUsers.map(user => (
                   <div key={user.uid} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-yellow-50/50 hover:bg-yellow-50 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                          {user.displayName?.[0]}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-gray-900">{user.displayName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApprove(user.uid)}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition shadow-sm"
                        >
                          Approve Access
                        </button>
                      </div>
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SLIDE-OVER PANEL */}
      {selectedUser && (
        <UserDetailPanel 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onUpdate={fetchData} 
        />
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Reset All Usage?</h3>
              <p className="text-sm text-gray-500 mb-6">
                This will reset the token consumption counter for ALL users to 0. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setShowResetConfirm(false)}
                   className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-gray-200"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleResetUsage}
                   className="flex-1 py-2.5 bg-[#EF3D5A] text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-[#D02844]"
                 >
                   Confirm Reset
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// Stats Card Component
const StatsCard = ({ icon, label, value }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4 hover:shadow-md transition-all duration-300">
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">{icon}</div>
    <div>
      <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</div>
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    approved: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    banned: 'bg-gray-900 text-white border-gray-900'
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${styles[status] || styles.pending} uppercase shadow-sm`}>
      {status}
    </span>
  );
};
// End of AdminDashboard.tsx

