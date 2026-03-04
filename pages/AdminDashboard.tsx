import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { getAllUsers, approveUserAccess } from '../services/userService';
import UserDetailPanel from './admin/UserDetailPanel';
import { 
  Users, Activity, AlertTriangle, CheckCircle, RefreshCw, 
  LayoutGrid, Shield, UserPlus, Infinity as InfinityIcon,
  BookOpen, FileText, Layers, Globe, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
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

  const [uniquePublishers, setUniquePublishers] = useState<string[]>([]);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('All Publishers');
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);

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

    const filteredActivities = selectedPublisher === 'All Publishers'
      ? allActivities
      : allActivities.filter(a => a.source?.publisher === selectedPublisher);

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
      const type = a.type; // Skills
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

    // 4. Activity Formats (type field)
    const formatCounts: Record<string, number> = {};
    filteredActivities.forEach(a => {
      const aType = a.type;
      if (aType) formatCounts[aType] = (formatCounts[aType] || 0) + 1;
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
    
    // First pass: collect all types from ALL activities (to ensure consistent columns)
    allActivities.forEach(a => {
      if (a.type) typesSet.add(a.type);
    });
    const sortedTypes = Array.from(typesSet).sort();
    setActivityTypes(sortedTypes);

    // Second pass: aggregate counts for ALL publishers
    allActivities.forEach(a => {
      const pub = a.source?.publisher || "Teacher's Own Materials";
      const type = a.type;
      
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

  }, [allActivities, allMagicLinks, selectedPublisher, users]);

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
            onClick={() => setActiveTab('governance')}
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Analytics Filter</h3>
                      <p className="text-xs text-gray-500">Drill down by publisher</p>
                    </div>
                  </div>
                  <div className="relative w-full md:w-64">
                    <select 
                      value={selectedPublisher}
                      onChange={(e) => setSelectedPublisher(e.target.value)}
                      className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <option value="All Publishers">All Publishers</option>
                      {uniquePublishers.map(pub => (
                        <option key={pub} value={pub}>{pub}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Platform Token Overview</h3>
                <p className="text-xs text-gray-400 font-medium mt-1">Global consumption and budget tracking</p>
              </div>
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 border border-[#EF3D5A] text-[#EF3D5A] rounded-lg hover:bg-[#EF3D5A] hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              >
                <RefreshCw size={14} /> Reset All Usage
              </button>
            </div>

            {(() => {
              const estCost = platformTokenStats.consumed * 0.0000024;
              const remainingTokens = platformTokenStats.allocated - platformTokenStats.consumed;
              const remainingBudget = monthlyBudget - estCost;
              
              const budgetConsumedPercent = monthlyBudget > 0 ? (estCost / monthlyBudget) * 100 : 0;
              const remainingBudgetPercent = monthlyBudget > 0 ? (remainingBudget / monthlyBudget) * 100 : 0;
              
              const getStatusColor = (percent: number) => {
                if (percent > 50) return 'text-green-600';
                if (percent >= 25) return 'text-amber-500';
                return 'text-[#EF3D5A]'; // Coral
              };

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Row 1 */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Budget</div>
                      <div className="text-2xl font-black text-gray-900">€{monthlyBudget.toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Allocated</div>
                      <div className="text-2xl font-black text-gray-900">{platformTokenStats.allocated.toLocaleString()} <span className="text-xs text-gray-400 font-medium">tokens</span></div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Consumed</div>
                      <div className="text-2xl font-black text-[#EF3D5A]">{platformTokenStats.consumed.toLocaleString()} <span className="text-xs text-gray-400 font-medium">tokens</span></div>
                    </div>

                    {/* Row 2 */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Est. Cost</div>
                      <div className="text-2xl font-black text-gray-900">€{estCost.toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Remaining Tokens</div>
                      <div className={`text-2xl font-black ${getStatusColor((remainingTokens / platformTokenStats.allocated) * 100)}`}>
                        {remainingTokens.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Remaining Budget</div>
                      <div className={`text-2xl font-black ${getStatusColor(remainingBudgetPercent)}`}>
                        €{remainingBudget.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      <span>Budget Consumed</span>
                      <span>{budgetConsumedPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#EF3D5A] rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(budgetConsumedPercent, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      Based on mistral-medium-latest pricing. Tracks all AI operations: OCR, extraction, drafting, conversion.
                    </p>
                  </div>
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
