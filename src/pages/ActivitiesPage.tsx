import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getActivities, deleteActivity, updateActivity, createMagicLink, getMagicLinksForActivity } from '../services/firestoreService';
import { convertToInteractive } from '../services/mistralService';
import { SessionResultsModal } from '../components/modals/SessionResultsModal';
import { ShareActivityModal } from '../components/modals/ShareActivityModal';
import { ManageClassesModal } from '../components/modals/ManageClassesModal';
import { Activity } from '../types';
import { 
  Search, Trash2, Plus, Star, ArrowLeft, MoreVertical, 
  RefreshCw, Filter, FileText, ChevronDown, Calendar, 
  Sparkles, PenTool, Edit3, Share2, BarChart2, Check, Flame, X, Play
} from 'lucide-react';
import { DraftBadge } from '../components/DraftBadge';
import toast from 'react-hot-toast';

interface ActivityCardProps {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
  onViewShare: () => void;
  formatDate: (date: any) => string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ 
  activity, 
  onEdit, 
  onDelete, 
  onViewShare,
  formatDate 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      onClick={onEdit}
      className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-xl hover:border-gray-300 transition-all cursor-pointer group flex flex-col h-full"
    >
      {/* TOP ROW */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <DraftBadge status={activity.status as 'draft' | 'approved'} />
          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[9px] font-black uppercase rounded-md">
            {activity.level || 'B1'}
          </span>
        </div>
      </div>

      {/* TITLE */}
      <h3 className="font-black text-gray-900 text-base uppercase leading-tight mb-1 line-clamp-2 group-hover:text-coral transition-colors">
        {activity.title}
      </h3>
      
      {/* SUBTITLE */}
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
        {activity.activityType || 'Mixed Activity'}
      </p>

      {/* FOOTER */}
      <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
        <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase">
          <Calendar size={12} />
          <span>{formatDate(activity.createdAt)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="px-4 py-2 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all shadow-md flex items-center gap-1.5"
          >
            <Play size={10} /> Open
          </button>
          
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {isMenuOpen && (
              <div 
                ref={menuRef}
                className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 origin-bottom-right"
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onViewShare(); }}
                  className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <Share2 size={14} />
                  <span className="text-[10px] font-black uppercase">View & Share</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                  <span className="text-[10px] font-black uppercase">Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ActivitiesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const [filterPublisher, setFilterPublisher] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'published'>('all');
  const [shareModalActivity, setShareModalActivity] = useState<Activity | null>(null);
  const [showManageClasses, setShowManageClasses] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, title: string} | null>(null);

  const [resultsModalActivity, setResultsModalActivity] = useState<Activity | null>(null);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getActivities(user.uid);
      setActivities(data);
    } catch (err) {
      console.error("Failed to load activities:", err);
      toast.error("Could not load activities.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    console.log('Delete clicked for:', id, title);
    setDeleteConfirm({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    console.log('Attempting to delete activity:', deleteConfirm.id);
    
    try {
      await deleteActivity(deleteConfirm.id);
      console.log('Delete successful');
      setActivities(prev => prev.filter(a => a.id !== deleteConfirm.id));
      toast.success('Activity deleted');
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete activity');
    }
    
    setDeleteConfirm(null);
  };

  const handleEdit = (activity: Activity) => {
    navigate('/app', { state: { editActivity: activity, mobileTab: 'workbench' } });
  };

  const handleToggleFavorite = async (activity: Activity) => {
    try {
      await updateActivity(activity.id, { isFavorite: !activity.isFavorite });
      setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, isFavorite: !a.isFavorite } : a));
    } catch (err) {
      toast.error("Failed to update favorite status");
    }
  };

  const handleViewShare = async (activity: Activity) => {
    setShareModalActivity(activity);
    setMagicLinkUrl(null);
  };

  const handleCreateMagicLink = async () => {
    if (!shareModalActivity || !user) return;
    setIsCreatingLink(true);
    try {
      if (!shareModalActivity.interactiveData || !shareModalActivity.interactiveData.questions || shareModalActivity.interactiveData.questions.length === 0) {
        const interactiveResult = await convertToInteractive(shareModalActivity.studentContent, shareModalActivity.answerKey || '');
        if (interactiveResult && interactiveResult.questions && interactiveResult.questions.length > 0) {
          await updateActivity(shareModalActivity.id, { interactiveData: interactiveResult });
          setShareModalActivity(prev => prev ? { ...prev, interactiveData: interactiveResult } : prev);
          setActivities(prev => prev.map(a => a.id === shareModalActivity.id ? { ...a, interactiveData: interactiveResult } : a));
        } else {
          toast.error("Interactive conversion failed.");
        }
      }

      const link = await createMagicLink(user.uid, shareModalActivity.id, {
        mode: 'test',
        collectName: true,
        showAnswers: false
      });
      const url = `${window.location.origin}/#/test/${link.id}`;
      setMagicLinkUrl(url);
      toast.success('Magic link created!');
    } catch (err) {
      toast.error('Failed to create link');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (magicLinkUrl) {
      navigator.clipboard.writeText(magicLinkUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleViewResults = (activity: Activity) => {
    setResultsModalActivity(activity);
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Unknown';
    if (dateValue.toDate) return dateValue.toDate().toLocaleDateString();
    return new Date(dateValue).toLocaleDateString();
  };

  // Filter Logic
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchesSearch = !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || a.activityType === filterType;
      const matchesLevel = !filterLevel || a.level === filterLevel;
      const matchesPublisher = !filterPublisher || a.source?.publisher === filterPublisher;
      const matchesFavorites = !showFavoritesOnly || a.isFavorite;
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'drafts' ? a.status === 'draft' :
        (a.status === 'approved' || a.status === 'published');

      return matchesSearch && matchesType && matchesLevel && matchesPublisher && matchesFavorites && matchesTab;
    });
  }, [activities, searchTerm, filterType, filterLevel, filterPublisher, showFavoritesOnly, activeTab]);

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    const timeA = a.createdAt ? (a.createdAt as any).seconds || new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? (b.createdAt as any).seconds || new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType(null);
    setFilterLevel(null);
    setFilterPublisher(null);
    setShowFavoritesOnly(false);
  };

  const hasActiveFilters = searchTerm || filterType || filterLevel || filterPublisher || showFavoritesOnly;

  if (loading && activities.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-coral" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <Header />
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 pt-20">
        <div className="max-w-7xl mx-auto px-6 py-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/app')} className="p-2 text-gray-400 hover:text-coral transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 uppercase">My Activities</h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
                  {activities.length} Activities Created
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/app', { state: { mobileTab: 'partner' } })} 
              className="px-6 py-3 bg-coral text-white text-[11px] font-black rounded-2xl hover:bg-[#DC2E4A] transition-all flex items-center gap-2 shadow-lg shadow-coral/20 uppercase tracking-widest active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create New
            </button>
          </div>
          
          {/* TABS & SEARCH */}
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'drafts', label: 'Drafts' },
                { id: 'published', label: 'Published' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeTab === tab.id 
                      ? 'bg-gray-900 text-white shadow-md' 
                      : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="Search activities..." 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-[20px] text-sm font-bold outline-none focus:border-coral transition-all" 
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-5 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${
                  showFilters || hasActiveFilters
                    ? 'bg-coral text-white border-coral shadow-lg shadow-coral/20'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Filter size={16} />
                Filters
              </button>
            </div>

            {/* EXPANDED FILTERS */}
            {showFilters && (
              <div className="bg-white border border-gray-200 rounded-[24px] p-6 animate-in slide-in-from-top-2 duration-200 shadow-sm">
                <div className="mb-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">CEFR Level</p>
                  <div className="flex flex-wrap gap-2">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
                      <button
                        key={level}
                        onClick={() => setFilterLevel(filterLevel === level ? null : level)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          filterLevel === level ? 'bg-coral text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[10px] font-bold text-coral uppercase hover:underline flex items-center gap-1"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8 lg:px-8">
        {sortedActivities.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-[24px] flex items-center justify-center text-gray-300 mb-6">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
              No activities found
            </h3>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest max-w-[280px] leading-relaxed">
              {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Get started by creating your first activity in the Studio.'}
            </p>
            {!hasActiveFilters && (
              <button 
                onClick={() => navigate('/app')}
                className="mt-8 px-6 py-3 bg-coral text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-coral/20 hover:bg-[#DC2E4A] transition-all"
              >
                Go to Studio
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedActivities.map(activity => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onEdit={() => handleEdit(activity)}
                onDelete={() => handleDelete(activity.id, activity.title)}
                onViewShare={() => setShareModalActivity(activity)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </main>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Activity?</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to delete "<span className="font-medium">{deleteConfirm.title}</span>"? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareModalActivity && (
        <ShareActivityModal
          isOpen={!!shareModalActivity}
          onClose={() => setShareModalActivity(null)}
          activity={shareModalActivity}
          onManageClasses={() => { setShareModalActivity(null); setShowManageClasses(true); }}
        />
      )}

      {showManageClasses && (
        <ManageClassesModal
          onClose={() => setShowManageClasses(false)}
        />
      )}

      {/* RESULTS MODAL */}
      {resultsModalActivity && (
        <SessionResultsModal 
          isOpen={!!resultsModalActivity} 
          onClose={() => setResultsModalActivity(null)} 
          activity={resultsModalActivity} 
        />
      )}
    </div>
  );
};
