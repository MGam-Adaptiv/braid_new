import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { 
  getPaginatedMaterials, 
  getTeacherLabels,
  deleteMaterial, 
  toggleMaterialFavorite,
  recordMaterialUsage
} from '../services/firestoreService';
import { Material, TeacherLabel } from '../types';
import { 
  Search, 
  Trash2, 
  Plus, 
  Star, 
  ArrowLeft,
  MoreVertical,
  RefreshCw,
  BookOpen,
  Sparkles,
  PenTool,
  Play,
  Filter,
  FolderOpen,
  AlertCircle,
  Calendar,
  X,
  ChevronDown,
  Flame
} from 'lucide-react';

interface MaterialCardProps {
  material: Material;
  onUse: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  formatDate: (date: any) => string;
}

const MaterialCard: React.FC<MaterialCardProps> = ({ 
  material, 
  onUse, 
  onToggleFavorite, 
  onDelete, 
  openMenuId, 
  setOpenMenuId, 
  formatDate 
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const isTopSource = material.timesUsed >= 30;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpenMenuId]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-xl hover:border-gray-300 transition-all cursor-pointer group flex flex-col" onClick={onUse}>
      
      {/* TOP ROW: Badges + Star */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isTopSource && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase rounded-md flex items-center gap-1 shadow-sm">
              <Flame size={10} /> Top Source
            </span>
          )}
          <span className="px-2.5 py-1 bg-gray-900 text-white text-[9px] font-black uppercase rounded-md">
            {material.level || 'B1'}
          </span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`shrink-0 p-1 transition-colors ${material.isFavorite ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
        >
          <Star size={18} fill={material.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* TITLE */}
      <h3 className="font-black text-gray-900 text-base uppercase leading-tight mb-1 line-clamp-2 group-hover:text-coral transition-colors">
        {material.bookTitle || material.title}
      </h3>
      
      {/* SUBTITLE */}
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
        {material.publisher}
      </p>

      {/* STATS ROW */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
          <Sparkles size={12} className="text-coral" />
          <span>{material.vocabulary?.length || 0} vocab</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
          <PenTool size={12} className="text-amber-500" />
          <span>{material.grammar?.length || 0} grammar</span>
        </div>
      </div>

      {/* TAGS */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(material.unitTags || []).slice(0, 3).map((tag, i) => (
          <span key={`u-${i}`} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-md border border-blue-100">
            {tag}
          </span>
        ))}
        {(material.labelTags || []).slice(0, 2).map((tag, i) => (
          <span key={`l-${i}`} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black uppercase rounded-md">
            {tag}
          </span>
        ))}
      </div>

      {/* FOOTER */}
      <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
        <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase">
          <Calendar size={12} />
          <span>{formatDate(material.createdAt)}</span>
          {material.timesUsed > 0 && (
            <>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>Used {material.timesUsed}x</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onUse(); }}
            className="px-4 py-2 bg-coral text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#DC2E4A] transition-all shadow-md shadow-coral/20 flex items-center gap-1.5"
          >
            <Play size={10} /> Use
          </button>
          
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === material.id ? null : material.id); }}
              className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {openMenuId === material.id && (
              <div 
                ref={menuRef}
                className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 origin-bottom-right"
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                  className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <Star size={14} className="text-amber-400" fill={material.isFavorite ? 'currentColor' : 'none'} />
                  <span className="text-[10px] font-black uppercase text-gray-700">
                    {material.isFavorite ? 'Unfavorite' : 'Favorite'}
                  </span>
                </button>
                <div className="h-px bg-gray-100 my-1" />
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

export const MaterialsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [teacherLabels, setTeacherLabels] = useState<TeacherLabel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPublisher, setFilterPublisher] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showTopSourcesOnly, setShowTopSourcesOnly] = useState(false);
  const [filterLevel, setFilterLevel] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  // Initial Load & Filter Reset
  useEffect(() => {
    if (user) {
      // Reset pagination when search or filters change
      loadData(true);
      fetchLabels();
    }
  }, [user, searchQuery, filterPublisher, filterUnit, filterLabels, showFavoritesOnly, showTopSourcesOnly, filterLevel]);

  const fetchLabels = async () => {
    if (!user) return;
    try {
      const labels = await getTeacherLabels(user.uid);
      setTeacherLabels(labels);
    } catch (e) {
      console.error("Failed to load labels");
    }
  };

  const loadData = async (isReset: boolean = false) => {
    if (!user) return;
    
    if (isReset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // Use null for lastDoc if resetting, otherwise use current state lastDoc
      const cursor = isReset ? null : lastDoc;
      const { data, lastVisible } = await getPaginatedMaterials(user.uid, cursor, 12);
      
      setMaterials(prev => isReset ? data : [...prev, ...data]);
      setLastDoc(lastVisible);
      setHasMore(data.length === 12); // If we got less than limit, no more pages
    } catch (err) {
      console.error("Failed to load materials:", err);
      showToast("Could not load materials.");
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Get unique publishers and units for filter dropdowns (from loaded materials)
  const publishers = useMemo(() => 
    [...new Set(materials.map(m => m.publisher).filter(Boolean))],
    [materials]
  );
  
  const units = useMemo(() => 
    [...new Set(materials.flatMap(m => m.unitTags).filter(Boolean))],
    [materials]
  );

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Client-side filtering logic to handle search within fetched pages
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = !searchQuery || 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.topic.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPublisher = !filterPublisher || m.publisher === filterPublisher;
      const matchesUnit = !filterUnit || m.unitTags.includes(filterUnit);
      const matchesLabels = filterLabels.length === 0 || 
        filterLabels.some(label => m.labelTags.includes(label));
      const matchesFavorites = !showFavoritesOnly || m.isFavorite;
      const matchesTopSources = !showTopSourcesOnly || (m.timesUsed >= 30);
      const matchesLevel = !filterLevel || m.level === filterLevel;
      
      return matchesSearch && matchesPublisher && matchesUnit && matchesLabels && matchesFavorites && matchesTopSources && matchesLevel;
    });
  }, [materials, searchQuery, filterPublisher, filterUnit, filterLabels, showFavoritesOnly, showTopSourcesOnly, filterLevel]);

  const handleDelete = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Material",
      message: `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      type: "danger",
      onConfirm: async () => {
        try {
          await deleteMaterial(id);
          setMaterials(prev => prev.filter(m => m.id !== id));
          setOpenMenuId(null);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          showToast("Material deleted.");
        } catch (err) {
          showToast("Failed to delete.");
        }
      }
    });
  };

  const handleToggleFavorite = async (material: Material) => {
    const newVal = !material.isFavorite;
    try {
      await toggleMaterialFavorite(material.id, newVal);
      setMaterials(prev => prev.map(m => 
        m.id === material.id ? { ...m, isFavorite: newVal } : m
      ));
    } catch (err) {
      console.error("Toggle favorite error:", err);
    }
  };

  const handleUseMaterial = async (material: Material) => {
    try {
      // Record usage
      await recordMaterialUsage(material.id);
      
      // Navigate to app with material data in state
      navigate('/app', { 
        state: { 
          loadMaterial: material,
          mobileTab: 'source'
        } 
      });
    } catch (err) {
      console.error("Use material error:", err);
      showToast("Failed to load material.");
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Unknown';
    if (dateValue.toDate) return dateValue.toDate().toLocaleDateString();
    return new Date(dateValue).toLocaleDateString();
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterPublisher('');
    setFilterUnit('');
    setFilterLevel('');
    setFilterLabels([]);
    setShowFavoritesOnly(false);
    setShowTopSourcesOnly(false);
  };

  const hasActiveFilters = searchQuery || filterPublisher || filterUnit || filterLabels.length > 0 || showFavoritesOnly || showTopSourcesOnly || filterLevel;

  const toggleLabelFilter = (label: string) => {
    setFilterLabels(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label) 
        : [...prev, label]
    );
  };

  if (loading && materials.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-coral" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <Header />
      {/* TOAST */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <AlertCircle size={16} className="text-coral" />
          {toast}
        </div>
      )}

      {/* CONFIRM DIALOG */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
              confirmDialog.type === 'danger' ? 'bg-coral/10 text-coral' : 'bg-blue-100 text-blue-600'
            }`}>
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-8">{confirmDialog.message}</p>
            <div className="flex flex-col gap-2">
              <button 
                type="button"
                onClick={confirmDialog.onConfirm}
                className="w-full py-4 bg-coral text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-coral/20 transition-all active:scale-[0.98]"
              >
                Delete Material
              </button>
              <button 
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-4 text-gray-400 font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 pt-20">
        <div className="max-w-7xl mx-auto px-6 py-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/app')} className="p-2 text-gray-400 hover:text-coral transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 uppercase">My Materials</h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
                  {materials.length} Items Loaded
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/app', { state: { mobileTab: 'source' } })} 
              className="px-6 py-3 bg-coral text-white text-[11px] font-black rounded-2xl hover:bg-[#DC2E4A] transition-all flex items-center gap-2 shadow-lg shadow-coral/20 uppercase tracking-widest active:scale-95"
            >
              <Plus className="w-4 h-4" /> Upload New
            </button>
          </div>
          
          {/* SEARCH & FILTERS */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  placeholder="Search title, book, or topic..." 
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
                {hasActiveFilters && (
                  <span className="w-5 h-5 bg-white text-coral rounded-full text-[10px] flex items-center justify-center">
                    {[filterPublisher, filterUnit, ...filterLabels, showFavoritesOnly ? 'fav' : '', showTopSourcesOnly ? 'top' : '', filterLevel].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* EXPANDED FILTERS */}
            {showFilters && (
              <div className="bg-white border border-gray-200 rounded-[24px] p-6 animate-in slide-in-from-top-2 duration-200 shadow-sm">
                
                {/* Favorites & Top Sources Toggle Row */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${
                      showFavoritesOnly
                        ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm'
                        : 'bg-gray-100 text-gray-600 border-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <Star size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                    Favorites Only
                  </button>
                  
                  <button
                    onClick={() => setShowTopSourcesOnly(!showTopSourcesOnly)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${
                      showTopSourcesOnly
                        ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-sm'
                        : 'bg-gray-100 text-gray-600 border-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <Flame size={14} />
                    Top Sources
                  </button>
                </div>

                {/* CEFR Level Row */}
                <div className="mb-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">CEFR Level</p>
                  <div className="flex flex-wrap gap-2">
                    {levels.map(level => (
                      <button
                        key={level}
                        onClick={() => setFilterLevel(filterLevel === level ? '' : level)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          filterLevel === level
                            ? 'bg-coral text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Publisher Row */}
                {publishers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Publisher</p>
                    <div className="flex flex-wrap gap-2">
                      {publishers.map(pub => (
                        <button
                          key={pub}
                          onClick={() => setFilterPublisher(filterPublisher === pub ? '' : pub)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            filterPublisher === pub
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {pub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unit Row */}
                {units.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Unit</p>
                    <div className="flex flex-wrap gap-2">
                      {units.map(unit => (
                        <button
                          key={unit}
                          onClick={() => setFilterUnit(filterUnit === unit ? '' : unit)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            filterUnit === unit
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Labels Row */}
                {teacherLabels.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Labels</p>
                    <div className="flex flex-wrap gap-2">
                      {teacherLabels.map(label => (
                        <button
                          key={label.id}
                          onClick={() => toggleLabelFilter(label.name)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                            filterLabels.includes(label.name)
                              ? 'text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 border-gray-100 hover:bg-gray-200'
                          }`}
                          style={filterLabels.includes(label.name) ? { backgroundColor: label.color, borderColor: label.color } : {}}
                        >
                          {label.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-[10px] font-bold text-coral uppercase hover:underline flex items-center gap-1"
                  >
                    <X size={12} /> Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8 lg:px-8">
        {filteredMaterials.length === 0 && !loading && (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-[24px] flex items-center justify-center text-gray-300 mb-6">
              {hasActiveFilters ? <Search size={32} /> : <FolderOpen size={32} />}
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
              {hasActiveFilters ? 'No materials found' : 'No saved materials yet'}
            </h3>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest max-w-[280px] leading-relaxed">
              {hasActiveFilters 
                ? 'Try adjusting your filters or search terms.' 
                : 'Upload coursebook pages and save them here for quick reuse.'}
            </p>
            {!hasActiveFilters && (
              <button 
                onClick={() => navigate('/app', { state: { mobileTab: 'source' } })}
                className="mt-8 px-6 py-3 bg-coral text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-coral/20 hover:bg-[#DC2E4A] transition-all"
              >
                Upload Your First Material
              </button>
            )}
          </div>
        )}

        {filteredMaterials.length > 0 && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map(m => (
                <MaterialCard 
                  key={m.id} 
                  material={m} 
                  onUse={() => handleUseMaterial(m)}
                  onToggleFavorite={() => handleToggleFavorite(m)}
                  onDelete={() => handleDelete(m.id, m.title)}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  formatDate={formatDate}
                />
              ))}
            </div>

            {/* LOAD MORE BUTTON */}
            {hasMore && !searchQuery && (
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => loadData(false)}
                  disabled={isLoadingMore}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-coral hover:text-coral transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoadingMore ? <RefreshCw className="animate-spin w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
