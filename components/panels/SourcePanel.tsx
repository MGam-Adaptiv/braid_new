import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudio, CombinedContent, PoolItem, CEFRLevel } from '../../context/StudioContext';
import { useAuth } from '../../context/AuthContext';
import { readPage, ExtractionResult } from '../../services/mistralService';
import { saveMaterial, getMaterials, recordMaterialUsage } from '../../services/firestoreService';
import { addCustomPublisher } from '../../services/userService';
import * as pdfjsLib from 'pdfjs-dist';
import { WorkflowStage, Material } from '../../types';
import { 
  FileText, Upload, Trash2, Plus, Edit3, Search, ChevronDown, Tag, 
  Book, Sparkles, X, Check, PenTool, RefreshCw, AlertCircle, 
  FolderOpen, Bookmark, Star, Play, ArrowRight, Camera, ShieldCheck, Layers, File, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
}

const PUBLISHERS = [
  'Cambridge University Press', 'Oxford University Press', 'Pearson', 
  'Macmillan Education', 'National Geographic Learning', 'Express Publishing', 
  'MM Publications', 'Burlington Books', 'Richmond', 'Hamilton House', 
  'Hillside Press', 'Grivas Publications', 'Super Course'
];

const DISCLAIMER_TEXT = "Content Processing & Intellectual Property Disclaimer: All uploaded materials remain the intellectual property of their respective owners. We do not store, retain, or reuse any content that is uploaded. Materials are processed solely for the purpose of identifying linguistic features (e.g. vocabulary and grammar) to support the creation of personalized educational resources. Upon completion of processing, all content is immediately discarded.";

const TagInput: React.FC<any> = ({ tags, setTags, placeholder, icon: IconComp = Tag, maxTags = 5, color = 'gray' }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const colorClasses: any = { blue: 'bg-blue-50 text-blue-700 border-blue-200', amber: 'bg-amber-50 text-amber-700 border-amber-200', coral: 'bg-coral-light/30 text-coral border-coral/30', gray: 'bg-gray-100 text-gray-700 border-gray-200' };
  const addTag = (tag: string) => { const cleanTag = tag.replace(/,/g, '').trim(); if (!cleanTag || tags.length >= maxTags || tags.includes(cleanTag)) return; setTags([...tags, cleanTag]); setInputValue(''); };
  const removeTag = (index: number) => setTags(tags.filter((_, i) => i !== index));
  return (
    <div className="w-full min-h-[48px] p-2 bg-white border border-gray-200 rounded-xl flex flex-wrap gap-2 items-center cursor-text focus-within:border-coral transition-all" onClick={() => inputRef.current?.focus()}>
      {tags.map((tag: string, index: number) => (
        <span key={`${tag}-${index}`} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border uppercase tracking-wider ${colorClasses[color]} animate-in zoom-in-95 duration-150`}>
          <IconComp size={10} /><span>{tag}</span><button type="button" onClick={(e) => { e.stopPropagation(); removeTag(index); }} className="p-0.5 hover:bg-black/10 rounded-full"><X size={10} /></button>
        </span>
      ))}
      {tags.length < maxTags && <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTag(inputValue.trim()))} onBlur={() => inputValue.trim() && addTag(inputValue.trim())} placeholder={tags.length === 0 ? placeholder : ''} className="flex-1 min-w-[120px] bg-transparent outline-none text-[12px] font-bold placeholder-gray-300 uppercase tracking-widest py-1 text-gray-900" />}
    </div>
  );
};

interface PageItem { id: string; blobUrl: string; isTagged: boolean; unitTags: string[]; labelTags: string[]; analysisCached: boolean; isDirty: boolean; tagInfo?: any; analysis?: ExtractionResult; }
type PanelStage = 'IDLE' | 'TAGGING' | 'ANALYZING' | 'CONFIRMING' | 'READY';
interface SourcePanelProps { layout?: 'vertical' | 'horizontal'; }

export const SourcePanel: React.FC<SourcePanelProps> = ({ layout = 'vertical' }) => {
  const { user, userProfile } = useAuth();
  const location = useLocation();
  const { addSource, workflowStage, setWorkflowStage, setCombinedExtraction, combinedExtraction, poolItems, excludedItems, alwaysExcludedItems, excludeItem, alwaysExcludeItem, restoreItem, restoreAll } = useStudio();

  const [pages, setPages] = useState<PageItem[]>([]);
  const [stage, setStage] = useState<PanelStage>('IDLE');
  const [dossierTab, setDossierTab] = useState<'sources' | 'pool'>('sources');
  const [isLoading, setIsLoading] = useState(false);

  // Pool Panel filter/collapse/context-menu state
  const [poolSearch, setPoolSearch] = useState('');
  const [poolCefrFilter, setPoolCefrFilter] = useState<string[]>([]);
  const [poolTypeFilter, setPoolTypeFilter] = useState<'all' | 'vocabulary' | 'grammar'>('all');
  const [coreVocabOpen, setCoreVocabOpen] = useState(true);
  const [secVocabOpen, setSecVocabOpen] = useState(false);
  const [grammarOpen, setGrammarOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; term: string } | null>(null);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [coreVocab, setCoreVocab] = useState<string[]>([]);
  const [secondaryVocab, setSecondaryVocab] = useState<string[]>([]);
  const [coreGrammar, setCoreGrammar] = useState<string[]>([]);
  const [secondaryGrammar, setSecondaryGrammar] = useState<string[]>([]);
  
  // Custom Input States
  const [newVocabInput, setNewVocabInput] = useState('');
  const [newGrammarInput, setNewGrammarInput] = useState('');
  const [showReadingVocab, setShowReadingVocab] = useState(false);
  
  const [editedTopic, setEditedTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [formPublisher, setFormPublisher] = useState('');
  const [customPublisher, setCustomPublisher] = useState('');
  const [formBookTitle, setFormBookTitle] = useState('');
  const [allPublishers, setAllPublishers] = useState<string[]>(PUBLISHERS);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMaterialTitle, setSaveMaterialTitle] = useState('');
  const [saveMaterialLabels, setSaveMaterialLabels] = useState<string[]>([]);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [materialSaved, setMaterialSaved] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedMaterials, setSavedMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedMaterialRef = useRef(false);

  useEffect(() => {
    if (userProfile?.customPublishers) {
      const merged = Array.from(new Set([...PUBLISHERS, ...userProfile.customPublishers])).sort();
      setAllPublishers(merged);
    }
  }, [userProfile]);

  const handleLoadMaterial = async (material: Material) => { hasLoadedMaterialRef.current = true; await recordMaterialUsage(material.id); const isStandard = allPublishers.includes(material.publisher); if (material.publisher && !isStandard) { setFormPublisher('Other...'); setCustomPublisher(material.publisher); } else { setFormPublisher(material.publisher || ''); setCustomPublisher(''); } setFormBookTitle(material.bookTitle || ''); setCoreVocab(material.coreVocabulary?.length ? material.coreVocabulary : material.vocabulary || []); setSecondaryVocab(material.secondaryVocabulary || []); setCoreGrammar(material.grammar || []); setSecondaryGrammar([]); setEditedTopic(material.topic || 'General English'); setSelectedLevel(material.level || 'B1'); const ghostPages: PageItem[] = (material.ocrTexts || []).map((text, i) => ({ id: `m-${material.id}-${i}`, blobUrl: '', isTagged: true, unitTags: material.unitTags, labelTags: material.labelTags, analysisCached: true, isDirty: false, analysis: { readingText: { content: text, present: true, confidence: 'high', type: 'passage' } } as ExtractionResult })); setPages(ghostPages); setStage('CONFIRMING'); setWorkflowStage('extracting'); setMaterialSaved(true); setShowLoadModal(false); };
  useEffect(() => { const state = location.state as { loadMaterial?: Material } | null; if (state?.loadMaterial && !hasLoadedMaterialRef.current) { handleLoadMaterial(state.loadMaterial); window.history.replaceState({}, document.title); } }, [location.state]);
  const startCamera = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); setCameraStream(stream); if (videoRef.current) videoRef.current.srcObject = stream; } catch (err) { setIsCameraOpen(false); } };
  const stopCamera = () => { if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); setCameraStream(null); } };
  useEffect(() => { if (isCameraOpen) startCamera(); else stopCamera(); return () => stopCamera(); }, [isCameraOpen]);
  const convertPDFToImage = async (file: File): Promise<string> => { const arrayBuffer = await file.arrayBuffer(); const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer }); const pdf = await loadingTask.promise; const page = await pdf.getPage(1); const viewport = page.getViewport({ scale: 2 }); const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height; const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas context error'); await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise; return new Promise(res => canvas.toBlob(b => res(URL.createObjectURL(b!)), 'image/png')); };
  const handleFiles = useCallback(async (files: FileList | null) => { if (!files?.length) return; const remaining = 5 - pages.length; if (remaining <= 0) return toast.error('Max 5 pages'); setIsLoading(true); try { const newPages: PageItem[] = []; for (const file of Array.from(files).slice(0, remaining)) { const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'); const blobUrl = isPDF ? await convertPDFToImage(file) : URL.createObjectURL(file); newPages.push({ id: Math.random().toString(36).substr(2, 9), blobUrl, isTagged: false, unitTags: [], labelTags: [], analysisCached: false, isDirty: true }); } setPages(p => [...p, ...newPages]); if (stage === 'IDLE') { setStage('TAGGING'); setWorkflowStage('tagging'); } } catch (err) { console.error(err); } finally { setIsLoading(false); } }, [pages.length, stage, setWorkflowStage]);

  const handleSaveAndContinue = async () => {
    if (!user) return;
    if (formPublisher === 'Other...' && customPublisher.trim() && user) { await addCustomPublisher(user.uid, customPublisher.trim()); }
    setWorkflowStage('extracting'); setStage('ANALYZING');
    const updatedPages = [...pages];
    const analyses: ExtractionResult[] = [];
    const finalPublisher = formPublisher === 'Other...' ? customPublisher : formPublisher;
    for (let i = 0; i < pages.length; i++) { const result = await readPage(updatedPages[i].blobUrl, user.uid); if (!result.error) { analyses.push(result); updatedPages[i] = { ...updatedPages[i], analysis: result, analysisCached: true, isDirty: false, isTagged: true, tagInfo: { publisher: finalPublisher, bookTitle: formBookTitle } }; } }
    setPages(updatedPages);

    if (analyses.length === 0) {
      toast.error("Scan failed — could not reach the AI service. Check your connection and try again.");
      setStage('TAGGING');
      setWorkflowStage('tagging');
      return;
    }

    // Use AI two-tier vocab if available, fall back to legacy flat list split
    const targetItems = analyses.flatMap(e => e.targetVocabulary?.items || e.vocabulary?.items?.slice(0, 20) || []);
    const contextItems = analyses.flatMap(e => e.contextVocabulary?.items || e.vocabulary?.items?.slice(20) || []);
    const coreSet = new Set(targetItems);
    const secondarySet = new Set(contextItems.filter(w => !coreSet.has(w)));
    setCoreVocab(Array.from(coreSet));
    setSecondaryVocab(Array.from(secondarySet));
    const grammarSet = new Set<string>(); analyses.forEach(e => e.grammar?.points?.forEach(g => grammarSet.add(g)));
    setCoreGrammar(Array.from(grammarSet).slice(0, 5)); setSecondaryGrammar(Array.from(grammarSet).slice(5));
    setEditedTopic(analyses[0]?.topic || 'General English'); setSelectedLevel(analyses[0]?.estimatedLevel || 'A1');
    setStage('CONFIRMING');
  };

  const executeSave = async () => {
    if (!user) return;
    try {
      const finalPublisher = formPublisher === 'Other...' ? customPublisher : formPublisher;
      if (formPublisher === 'Other...' && customPublisher.trim()) { await addCustomPublisher(user.uid, customPublisher.trim()); }
      const materialData = {
        title: saveMaterialTitle || `${formBookTitle} - ${new Date().toLocaleDateString()}`,
        publisher: finalPublisher, bookTitle: formBookTitle,
        unitTags: pages.flatMap(p => p.unitTags), labelTags: saveMaterialLabels,
        coreVocabulary: coreVocab,
        secondaryVocabulary: secondaryVocab,
        vocabulary: [...coreVocab, ...secondaryVocab], grammar: [...coreGrammar, ...secondaryGrammar],
        topic: editedTopic, level: selectedLevel, pageCount: pages.length,
        ocrTexts: pages.map(p => p.analysis?.readingText?.content || ''),
        pageNumbers: pages.map(p => p.analysis?.pageNumber ?? null)
      };
      await saveMaterial(user.uid, materialData);
      setMaterialSaved(true);
      toast.success("Material Saved");
    } catch (err) { console.error("Save failed", err); }
  };

  const handleOpenLoadModal = async () => {
    if (!user) return;
    setIsLoadingMaterials(true);
    setShowLoadModal(true);
    try {
      const mats = await getMaterials(user.uid);
      setSavedMaterials(mats);
    } catch (e) {
      toast.error("Could not load materials");
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const handleOpenSaveModal = () => {
    setSaveMaterialTitle(formBookTitle);
    setSaveMaterialLabels([]);
    setShowSaveModal(true);
  };

  const finalizeAnalysis = async () => {
    // Only update local session state, do NOT auto-save to DB
    const finalPublisher = formPublisher === 'Other...' ? customPublisher : formPublisher;
    const combinedData = { vocabulary: coreVocab, secondaryVocabulary: secondaryVocab, grammar: coreGrammar, topic: editedTopic, level: selectedLevel, ocrTexts: pages.map(p => p.analysis?.readingText?.content || ''), pageCount: pages.length, allTags: { publisher: finalPublisher, bookTitle: formBookTitle, unitTags: pages.flatMap(p => p.unitTags), labelTags: pages.flatMap(p => p.labelTags), pages: [] } };
    setCombinedExtraction(combinedData);
    addSource({ id: `c-${Date.now()}`, title: formBookTitle || 'Source', type: 'multi-page', content: JSON.stringify(combinedData), createdAt: Date.now() });
    setStage('READY'); setWorkflowStage('drafting');
  };

  const addCustomVocab = () => {
    if (newVocabInput.trim()) {
      setCoreVocab(prev => [...prev, newVocabInput.trim()]);
      setNewVocabInput('');
    }
  };

  const addCustomGrammar = () => {
    if (newGrammarInput.trim()) {
      setCoreGrammar(prev => [...prev, newGrammarInput.trim()]);
      setNewGrammarInput('');
    }
  };

  const isHorizontal = layout === 'horizontal';
  
  if (workflowStage === 'drafting' || workflowStage === 'approved') {
    // ── Pool Panel helpers ──
    const CEFR_LEVELS: CEFRLevel[] = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const cefrBadgeClass = (level: string) => {
      if (['Pre-A1', 'A1', 'A2'].includes(level)) return 'bg-green-100 text-green-700 border-green-200';
      if (['B1', 'B2'].includes(level)) return 'bg-amber-100 text-amber-700 border-amber-200';
      return 'bg-red-100 text-red-700 border-red-200';
    };

    const isExcluded = (term: string) => excludedItems.includes(term) || alwaysExcludedItems.includes(term);
    const isAlwaysExcluded = (term: string) => alwaysExcludedItems.includes(term);

    // Apply filters
    const filteredItems = poolItems.filter(item => {
      const matchesSearch = !poolSearch || item.term.toLowerCase().includes(poolSearch.toLowerCase());
      const matchesCefr = poolCefrFilter.length === 0 || poolCefrFilter.includes(item.cefrLevel);
      const matchesType = poolTypeFilter === 'all' || item.type === poolTypeFilter;
      return matchesSearch && matchesCefr && matchesType;
    });

    const filteredCoreVocab  = filteredItems.filter(i => i.type === 'vocabulary' && i.subtype === 'core');
    const filteredSecVocab   = filteredItems.filter(i => i.type === 'vocabulary' && i.subtype === 'secondary');
    const filteredGrammar    = filteredItems.filter(i => i.type === 'grammar');

    const totalExcluded = Array.from(new Set([...excludedItems, ...alwaysExcludedItems])).length;

    // Pool chip component (inline)
    const PoolChip = ({ item }: { item: PoolItem }) => {
      const excl = isExcluded(item.term);
      const always = isAlwaysExcluded(item.term);
      return (
        <div
          key={item.term}
          onContextMenu={e => { e.preventDefault(); if (!excl) setContextMenu({ x: e.clientX, y: e.clientY, term: item.term }); }}
          className={`group inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold border transition-all select-none ${
            excl
              ? 'bg-gray-50 text-gray-300 border-gray-100'
              : item.type === 'vocabulary'
                ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 cursor-default'
                : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 cursor-default'
          }`}
        >
          <span className={excl ? 'line-through' : ''}>{item.term}</span>
          <span className={`text-[6px] font-black px-1 py-0.5 rounded border ${cefrBadgeClass(item.cefrLevel)}`}>
            {item.cefrLevel}
          </span>
          {always && !excl && (
            <span className="text-[6px] font-black text-red-400 uppercase">∞</span>
          )}
          <button
            onClick={() => excl ? restoreItem(item.term) : excludeItem(item.term)}
            className={`ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full text-[9px] leading-none transition-all ${
              excl
                ? 'text-green-500 hover:text-green-700 hover:bg-green-50'
                : 'text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100'
            }`}
            title={excl ? 'Restore' : 'Exclude'}
          >
            {excl ? '↩' : '×'}
          </button>
        </div>
      );
    };

    // Collapsible section header
    const SectionHeader = ({ label, count, activeCount, open, onToggle }: { label: string; count: number; activeCount: number; open: boolean; onToggle: () => void }) => (
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-1 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-700 transition-colors">{label}</span>
          <span className="text-[7px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">{activeCount}/{count}</span>
        </div>
        <ChevronDown size={10} className={`text-gray-300 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
    );

    return (
      <div className={`h-full flex ${isHorizontal ? 'flex-row items-center px-6 gap-8' : 'flex-col'} bg-white overflow-hidden border-r border-gray-100`}
        onClick={() => contextMenu && setContextMenu(null)}
      >
        <div className="flex flex-col w-full h-full">

          {/* PANEL HEADER */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
                <FolderOpen className="text-coral" size={14} /> Active Material
              </h3>
              <button onClick={() => { setStage('TAGGING'); setWorkflowStage('tagging'); }} className="text-[9px] font-black uppercase tracking-widest text-coral hover:underline flex items-center gap-1">
                <Edit3 size={10} /> Edit
              </button>
            </div>
            {/* Tab bar */}
            <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
              <button
                onClick={() => setDossierTab('sources')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${dossierTab === 'sources' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Sources
              </button>
              <button
                onClick={() => setDossierTab('pool')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${dossierTab === 'pool' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Pool
                {totalExcluded > 0 && (
                  <span className="bg-amber-400 text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {totalExcluded}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">

            {/* ── SOURCES TAB ── */}
            {dossierTab === 'sources' && (
              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                  <div className="w-16 h-20 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
                    <Book className="text-gray-300" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-sm uppercase leading-tight mb-1">{formBookTitle || 'Untitled'}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{formPublisher}</p>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-white border border-gray-200 rounded text-[9px] font-bold text-gray-500 uppercase">{selectedLevel}</span>
                      <span className="px-2 py-1 bg-white border border-gray-200 rounded text-[9px] font-bold text-gray-500 uppercase">{pages.length} Pages</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                    <div className="text-xl font-black text-blue-600">{poolItems.filter(i => i.type === 'vocabulary').length}</div>
                    <div className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Vocab</div>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                    <div className="text-xl font-black text-amber-600">{poolItems.filter(i => i.type === 'grammar').length}</div>
                    <div className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Grammar</div>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Layers size={10}/> Pages</p>
                  <div className="grid grid-cols-4 gap-2">
                    {pages.map((p, i) => (
                      <div key={p.id} className="aspect-[3/4] border border-gray-200 rounded-lg overflow-hidden relative shadow-sm bg-gray-50 flex items-center justify-center">
                        {p.blobUrl ? (
                          <img src={p.blobUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-300">
                            <File size={16} />
                            <span className="text-[8px] font-bold mt-1">Pg {i+1}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[8px] font-bold text-center py-0.5 truncate px-1">{p.unitTags[0] || `Pg ${i+1}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── POOL TAB ── */}
            {dossierTab === 'pool' && (
              <div className="space-y-4">

                {/* Header + total count */}
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                    <Sparkles size={10} className="text-coral" />
                    Vocabulary &amp; Grammar Pool
                    <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full text-[7px] font-black">{poolItems.length}</span>
                  </p>
                  {totalExcluded > 0 && (
                    <button
                      onClick={restoreAll}
                      className="text-[8px] font-black uppercase tracking-widest text-green-500 hover:text-green-700 transition-colors"
                    >
                      Restore all
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                  <input
                    value={poolSearch}
                    onChange={e => setPoolSearch(e.target.value)}
                    placeholder="Search pool..."
                    className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold outline-none focus:border-coral transition-colors placeholder-gray-300"
                  />
                </div>

                {/* Type filter */}
                <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                  {(['all', 'vocabulary', 'grammar'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setPoolTypeFilter(t)}
                      className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${poolTypeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {t === 'all' ? 'All' : t === 'vocabulary' ? 'Vocab' : 'Grammar'}
                    </button>
                  ))}
                </div>

                {/* CEFR multi-select filter */}
                <div className="flex flex-wrap gap-1">
                  {CEFR_LEVELS.map(level => {
                    const active = poolCefrFilter.includes(level);
                    return (
                      <button
                        key={level}
                        onClick={() => setPoolCefrFilter(prev => active ? prev.filter(l => l !== level) : [...prev, level])}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all border ${
                          active ? cefrBadgeClass(level) : 'bg-gray-100 text-gray-300 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                  {poolCefrFilter.length > 0 && (
                    <button onClick={() => setPoolCefrFilter([])} className="px-1.5 py-0.5 rounded text-[8px] font-black text-gray-300 hover:text-gray-500 transition-colors">
                      ✕ clear
                    </button>
                  )}
                </div>

                {/* Excluded items note */}
                {totalExcluded > 0 && (
                  <p className="text-[8px] text-amber-500 font-bold">
                    {totalExcluded} item{totalExcluded !== 1 ? 's' : ''} excluded from next generation
                    {alwaysExcludedItems.length > 0 && ` · ${alwaysExcludedItems.length} always excluded ∞`}
                  </p>
                )}

                {/* ── Core Vocabulary ── */}
                {(poolTypeFilter === 'all' || poolTypeFilter === 'vocabulary') && filteredCoreVocab.length > 0 && (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <SectionHeader
                        label="Core Vocabulary"
                        count={filteredCoreVocab.length}
                        activeCount={filteredCoreVocab.filter(i => !isExcluded(i.term)).length}
                        open={coreVocabOpen}
                        onToggle={() => setCoreVocabOpen(v => !v)}
                      />
                    </div>
                    {coreVocabOpen && (
                      <div className="px-3 py-3 flex flex-wrap gap-1.5">
                        {filteredCoreVocab.map(item => <PoolChip key={item.term} item={item} />)}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Secondary Vocabulary ── */}
                {(poolTypeFilter === 'all' || poolTypeFilter === 'vocabulary') && filteredSecVocab.length > 0 && (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <SectionHeader
                        label="Secondary Vocabulary"
                        count={filteredSecVocab.length}
                        activeCount={filteredSecVocab.filter(i => !isExcluded(i.term)).length}
                        open={secVocabOpen}
                        onToggle={() => setSecVocabOpen(v => !v)}
                      />
                    </div>
                    {secVocabOpen && (
                      <div className="px-3 py-3 flex flex-wrap gap-1.5">
                        {filteredSecVocab.map(item => <PoolChip key={item.term} item={item} />)}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Grammar Structures ── */}
                {(poolTypeFilter === 'all' || poolTypeFilter === 'grammar') && filteredGrammar.length > 0 && (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <SectionHeader
                        label="Grammar Structures"
                        count={filteredGrammar.length}
                        activeCount={filteredGrammar.filter(i => !isExcluded(i.term)).length}
                        open={grammarOpen}
                        onToggle={() => setGrammarOpen(v => !v)}
                      />
                    </div>
                    {grammarOpen && (
                      <div className="px-3 py-3 flex flex-wrap gap-1.5">
                        {filteredGrammar.map(item => <PoolChip key={item.term} item={item} />)}
                      </div>
                    )}
                  </div>
                )}

                {filteredItems.length === 0 && (
                  <p className="text-[10px] text-gray-300 text-center py-8 font-bold uppercase tracking-widest">
                    {poolItems.length === 0 ? 'No pool items extracted' : 'No items match filters'}
                  </p>
                )}

                <p className="text-[8px] text-gray-300 leading-relaxed pt-2">
                  Hover a chip and click × to exclude. Right-click for options. Excluded items are skipped by the AI agent on the next generation only, unless marked ∞ (always exclude).
                </p>
              </div>
            )}
          </div>

          <div className="px-5 pb-4 pt-2 border-t border-gray-100 shrink-0">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-[8px] text-gray-400 font-medium leading-relaxed text-justify italic">{DISCLAIMER_TEXT}</p>
            </div>
          </div>
        </div>

        {/* Right-click context menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { excludeItem(contextMenu.term); setContextMenu(null); }}
              className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-700 hover:bg-gray-50 uppercase tracking-widest transition-colors"
            >
              Exclude for this activity
            </button>
            <button
              onClick={() => { alwaysExcludeItem(contextMenu.term); setContextMenu(null); }}
              className="w-full text-left px-4 py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 uppercase tracking-widest transition-colors"
            >
              Always exclude ∞
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-[#F9FAFB] overflow-hidden ${isHorizontal ? 'max-h-[200px]' : ''}`}>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      {!isHorizontal && <div className="px-6 py-5 border-b border-gray-100 bg-white/80 backdrop-blur shrink-0 flex items-center justify-between"><h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Source Material</h2>{pages.length > 0 && <button onClick={() => { setPages([]); setStage('IDLE'); setWorkflowStage('tagging'); setCoreVocab([]); setSecondaryVocab([]); setCoreGrammar([]); setSecondaryGrammar([]); setEditedTopic(''); setFormBookTitle(''); setMaterialSaved(false); }} className="text-[10px] font-black text-coral uppercase hover:underline">Clear</button>}</div>}
      
      <div className={`flex-1 overflow-y-auto ${isHorizontal ? 'p-4' : 'p-6'} space-y-6 no-scrollbar`}>
        {stage === 'IDLE' ? (
          <div className={`${isHorizontal ? 'h-[120px] p-4' : 'h-[360px] p-8'} border-4 border-dashed rounded-[32px] flex flex-col items-center justify-center bg-white border-gray-200`} onDrop={e => (e.preventDefault(), handleFiles(e.dataTransfer.files))} onDragOver={e => e.preventDefault()}>
             <Upload size={40} className="text-gray-300 mb-6" />
             <p className="font-black text-gray-900 mb-2 uppercase">Drop your pages</p>
             <p className="text-[10px] text-gray-500 mb-8 font-bold uppercase">Images or PDF (Max 5)</p>
             <div className="flex gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-gray-900 text-white font-black text-[10px] uppercase rounded-xl hover:bg-black transition-all">Upload</button>
                <button onClick={handleOpenLoadModal} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-[10px] uppercase rounded-xl hover:bg-gray-50">My Materials</button>
             </div>
          </div>
        ) : stage === 'ANALYZING' ? (
           <div className="flex flex-col items-center justify-center h-[300px]"><RefreshCw className="animate-spin text-coral mb-4" /><h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Reading Page...</h3></div>
        ) : stage === 'CONFIRMING' ? (
           <div className="space-y-8 pb-10">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-5">
                 <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Book Info</h3>
                 <input value={formBookTitle} onChange={e => setFormBookTitle(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-900 rounded-xl font-bold text-sm outline-none focus:border-coral" placeholder="Book Title" />
                 <div className="flex gap-2">{['Pre-A1','A1','A2','B1','B2','C1','C2'].map(l => <button key={l} onClick={() => setSelectedLevel(l)} className={`flex-1 py-2 rounded-lg font-bold text-xs ${selectedLevel === l ? 'bg-coral text-white' : 'bg-gray-50'}`}>{l}</button>)}</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                 <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-1">Core Vocabulary ({coreVocab.length})</h3>
                 <p className="text-[10px] text-gray-400 font-medium mb-4">Target language explicitly taught on this page</p>
                 <div className="flex gap-2 mb-3">
                    <input
                      value={newVocabInput}
                      onChange={(e) => setNewVocabInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomVocab()}
                      placeholder="Add word..."
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-coral transition-colors"
                    />
                    <button onClick={addCustomVocab} className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"><Plus size={14} /></button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {coreVocab.map(v => <button key={v} onClick={() => { setCoreVocab(p => p.filter(x => x !== v)); setSecondaryVocab(p => [...p, v]); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-500">{v} ✕</button>)}
                 </div>
                 {secondaryVocab.length > 0 && (
                   <div className="mt-4 pt-4 border-t border-gray-100">
                     <button
                       onClick={() => setShowReadingVocab(v => !v)}
                       className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors w-full text-left"
                     >
                       <span>{showReadingVocab ? '▲' : '▼'} Reading Vocabulary ({secondaryVocab.length})</span>
                       <span className="text-[9px] normal-case font-medium text-gray-300">— tap to promote to core</span>
                     </button>
                     {showReadingVocab && (
                       <div className="flex flex-wrap gap-2 mt-3">
                         {secondaryVocab.map(v => <button key={v} onClick={() => { setSecondaryVocab(p => p.filter(x => x !== v)); setCoreVocab(p => [...p, v]); }} className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-600">{v} +</button>)}
                       </div>
                     )}
                   </div>
                 )}
              </div>

              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                 <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-4">Grammar ({coreGrammar.length})</h3>
                 <div className="flex gap-2 mb-3">
                    <input 
                      value={newGrammarInput}
                      onChange={(e) => setNewGrammarInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomGrammar()}
                      placeholder="Add point..."
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-coral transition-colors"
                    />
                    <button onClick={addCustomGrammar} className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"><Plus size={14} /></button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {coreGrammar.map(g => <button key={g} onClick={() => { setCoreGrammar(p => p.filter(x => x !== g)); setSecondaryGrammar(p => [...p, g]); }} className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-500">{g} ✕</button>)}
                 </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                 <button onClick={finalizeAnalysis} className="w-full py-4 bg-coral text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-coral/20 hover:bg-[#DC2E4A] hover:shadow-coral/30 transition-all flex items-center justify-center gap-2 active:scale-95">Start Drafting <ArrowRight size={14} /></button>
                 <button onClick={handleOpenSaveModal} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-500 hover:border-coral/30 hover:text-coral rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2"><Bookmark size={14} /> Add to Materials</button>
              </div>
              <div className="pt-8 px-4 opacity-60 text-[9px] text-gray-400 font-medium leading-relaxed border-t border-gray-100 mt-4 text-justify italic">{DISCLAIMER_TEXT}</div>
           </div>
        ) : (
           <div className="space-y-4">
              <div className="relative">
                <select value={formPublisher} onChange={(e) => setFormPublisher(e.target.value)} className="w-full p-4 border border-gray-200 bg-white text-gray-900 rounded-xl font-bold outline-none focus:border-coral appearance-none cursor-pointer"><option value="" disabled>Select Publisher...</option>{allPublishers.map(p => <option key={p} value={p}>{p}</option>)}<option value="Other...">Other...</option></select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
              {formPublisher === 'Other...' && <div className="animate-in fade-in slide-in-from-top-1"><input value={customPublisher} onChange={e => setCustomPublisher(e.target.value)} className="w-full p-4 border border-gray-200 bg-white text-gray-900 rounded-xl font-bold outline-none focus:border-coral" placeholder="Enter Custom Publisher Name..." /></div>}
              <input value={formBookTitle} onChange={e => setFormBookTitle(e.target.value)} className="w-full p-4 border border-gray-200 bg-white text-gray-900 rounded-xl font-bold outline-none focus:border-coral" placeholder="Book Title..." />
              {pages.map((p, i) => (
                 <div key={i} className="flex gap-4 p-4 bg-white border rounded-xl"><img src={p.blobUrl} className="w-12 h-16 object-cover bg-gray-100 rounded" /><div className="flex-1 space-y-2"><TagInput tags={p.unitTags} setTags={t => setPages(curr => curr.map((x, idx) => idx === i ? {...x, unitTags: t} : x))} placeholder="Unit..." /><TagInput tags={p.labelTags} setTags={t => setPages(curr => curr.map((x, idx) => idx === i ? {...x, labelTags: t} : x))} placeholder="Label..." color="amber" icon={Tag} /></div></div>
              ))}
              {pages.length < 5 && <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold uppercase text-[10px] hover:border-coral hover:text-coral transition-all flex items-center justify-center gap-2 bg-transparent"><Plus size={14} /> Add Another Page ({pages.length}/5)</button>}
              <button onClick={handleSaveAndContinue} disabled={!formBookTitle || !formPublisher || (formPublisher === 'Other...' && !customPublisher)} className="w-full py-4 bg-coral text-white font-black text-xs uppercase rounded-xl shadow-xl hover:bg-[#DC2E4A] transition-all disabled:opacity-50">Analyze Page →</button>
           </div>
        )}
      </div>
      
      {showSaveModal && <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"><div className="bg-white p-8 rounded-3xl w-full max-w-sm"><h3 className="font-black uppercase text-lg mb-4">Save Material</h3><input value={saveMaterialTitle} onChange={e => setSaveMaterialTitle(e.target.value)} className="w-full p-3 border rounded-xl mb-4 font-bold bg-white text-gray-900" placeholder="Title..." /><button onClick={() => { executeSave(); setShowSaveModal(false); }} className="w-full py-3 bg-coral text-white font-black uppercase rounded-xl mb-2">Save</button><button onClick={() => setShowSaveModal(false)} className="w-full py-3 text-gray-400 font-black uppercase">Cancel</button></div></div>}
      
      {/* IMPROVED RICH CARD LOAD MODAL */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
              <div>
                <h3 className="font-black uppercase text-xl tracking-tight">My Materials</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{savedMaterials.length} saved materials</p>
              </div>
              <button onClick={() => setShowLoadModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              {isLoadingMaterials ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="animate-spin text-coral mb-4" size={32} />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading materials...</p>
                </div>
              ) : savedMaterials.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-400 py-20">
                  <FolderOpen size={48} className="mb-4 opacity-20" />
                  <p className="font-black text-sm uppercase tracking-widest mb-2">No saved materials</p>
                  <p className="text-[10px] font-bold text-gray-300 uppercase">Upload and save materials to reuse them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedMaterials.map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => handleLoadMaterial(m)} 
                      className="bg-white border border-gray-200 rounded-[20px] overflow-hidden hover:border-coral/30 hover:shadow-xl transition-all cursor-pointer group flex flex-col"
                    >
                      {/* Card Header */}
                      <div className="px-5 pt-5 pb-4 flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-gray-900 truncate text-sm group-hover:text-coral transition-colors uppercase tracking-tight">
                              {m.title}
                            </h4>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                              {m.publisher} • {m.bookTitle}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); }}
                            className={`shrink-0 p-1 ${m.isFavorite ? 'text-amber-400' : 'text-gray-200'} transition-colors`}
                          >
                            <Star className="w-4 h-4" fill={m.isFavorite ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        
                        {/* Content Stats */}
                        <div className="flex flex-wrap gap-3 mb-3">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500">
                            <Sparkles size={10} className="text-coral" />
                            <span>{m.vocabulary?.length || 0} vocab</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500">
                            <PenTool size={10} className="text-amber-500" />
                            <span>{m.grammar?.length || 0} grammar</span>
                          </div>
                        </div>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(m.unitTags || []).slice(0, 2).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-md border border-blue-100">
                              {tag}
                            </span>
                          ))}
                          {(m.labelTags || []).slice(0, 2).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black uppercase rounded-md border border-gray-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        {/* Meta */}
                        <div className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase">
                          <Calendar size={10} />
                          <span>{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : 'Unknown'}</span>
                          {m.timesUsed > 0 && (
                            <>
                              <span className="w-1 h-1 bg-gray-200 rounded-full" />
                              <span>Used {m.timesUsed}x</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Card Footer */}
                      <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                        <span className="px-2 py-0.5 bg-white border border-gray-100 text-coral text-[9px] font-black rounded-full">
                          {m.level || 'B1'}
                        </span>
                        <span className="text-[9px] font-black text-coral uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <Play size={10} /> Select
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
