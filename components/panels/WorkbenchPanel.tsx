import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStudio } from '../../context/StudioContext';
import { useAuth } from '../../context/AuthContext';
import { saveActivity, updateActivity } from '../../services/firestoreService';
import { trackTokenUsage } from '../../services/tokenService';
import { BuildLogEntry } from '../../types';

import { marked } from 'marked';
import {
  Check, RefreshCw, Wand2, Key, Printer, Edit3,
  Bold, Italic, List, Maximize2, Minimize2, Save,
  Info, SplitSquareHorizontal, Sparkles, FileText, ChevronDown,
  Clock, Bot, User, ChevronUp, Scissors, TrendingUp, Layers, Zap, Users, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- ENHANCE OPTIONS ---
const ENHANCE_OPTIONS = [
  { key: 'simplify',           label: 'Simplify Content',       Icon: Scissors,    color: 'text-blue-600',   bg: 'hover:bg-blue-50' },
  { key: 'increase_difficulty',label: 'Increase Difficulty',    Icon: TrendingUp,  color: 'text-orange-600', bg: 'hover:bg-orange-50' },
  { key: 'add_scaffolding',    label: 'Add Scaffolding',        Icon: Layers,      color: 'text-purple-600', bg: 'hover:bg-purple-50' },
  { key: 'add_lead_in',        label: 'Add Lead-In',            Icon: Zap,         color: 'text-green-600',  bg: 'hover:bg-green-50' },
  { key: 'convert_pair_work',  label: 'Convert to Pair Work',   Icon: Users,       color: 'text-teal-600',   bg: 'hover:bg-teal-50' },
  { key: 'localise_context',   label: 'Localise Context',       Icon: Globe,       color: 'text-amber-600',  bg: 'hover:bg-amber-50' },
];

// --- BUILD LOG HELPERS ---
const BUILD_LOG_ICONS: Record<string, string> = {
  drafted:   '🤖',
  enhanced:  '✨',
  refined:   '💬',
  saved:     '💾',
  published: '✅',
  shared:    '🔗',
  results:   '📊',
};

const formatLogTime = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today ${timeStr}` : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${timeStr}`;
};

// --- HELPER: Parse Interactive Data from raw content ---
const parseInteractiveData = (rawContent: string) => {
  try {
    if (!rawContent) return null;
    
    const match = rawContent.match(/---INTERACTIVE DATA---[\s\S]*?```json\s*([\s\S]*?)\s*```/i);
    if (!match || !match[1]) return null;
    
    const parsed = JSON.parse(match[1].trim());
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return null;
    }
    
    // Build questions without undefined values
    const questions = parsed.questions.map((q: any, i: number) => {
      const question: any = {
        id: typeof q.id === 'number' ? q.id : i + 1,
        type: q.type || 'multiple-choice',
        question: q.question || '',
        points: q.points || 1
      };
      // Only add optional fields if they exist
      if (q.options) question.options = q.options;
      if (q.correctAnswer !== undefined) question.correctAnswer = q.correctAnswer;
      if (q.pairs) question.pairs = q.pairs;
      if (q.hint) question.hint = q.hint;
      return question;
    });
    
    // Build result without undefined values
    const result: any = {
      activityType: parsed.activityType || 'quiz',
      instructions: parsed.instructions || 'Complete all questions below.',
      questions: questions
    };
    // Only add optional fields if they exist
    if (parsed.wordBank && parsed.wordBank.length > 0) result.wordBank = parsed.wordBank;
    if (parsed.timeLimit) result.timeLimit = parsed.timeLimit;
    if (parsed.category) result.category = parsed.category;
    
    console.log('✅ Parsed interactive data:', questions.length, 'questions');
    return result;
    
  } catch (e) {
    console.error('parseInteractiveData failed:', e);
    return null;
  }
};

// --- HELPER: Activity Type Display ---
const formatActivityType = (type: string | null | undefined): string => {
  if (!type) return 'MIXED';
  const typeMap: Record<string, string> = {
    'reading': 'READING',
    'vocabulary': 'VOCAB',
    'grammar': 'GRAMMAR',
    'speaking': 'SPEAKING',
    'writing': 'WRITING',
    'mixed': 'MIXED'
  };
  return typeMap[type.toLowerCase()] || type.toUpperCase() || 'MIXED';
};

// --- SIMPLIFIED PARSER ENGINE ---
const parseActivityContent = (rawContent: string) => {
  let title = 'Untitled Activity';
  let type = 'Custom';
  let teacherNotes = '';
  let studentContent = '';
  let answerKey = '';
  
  // Metadata extraction helpers
  let level = 'B1'; 
  let target = 'General';
  let objectives: string[] = [];

  if (!rawContent) return { title, type, teacherNotes, studentContent, answerKey, level, target, objectives };

  // 1. Extract Main Sections via Regex
  const tNotesMatch = rawContent.match(/---TEACHER NOTES---([\s\S]*?)(?=---STUDENT CONTENT---|---STUDENT WORKSHEET---)/i);
  if (tNotesMatch) teacherNotes = tNotesMatch[1].trim();

  const sContentMatch = rawContent.match(/(?:---STUDENT CONTENT---|---STUDENT WORKSHEET---)([\s\S]*?)(?=---ANSWER KEY---|---ANSWERS---)/i);
  if (sContentMatch) studentContent = sContentMatch[1].trim();

  const aKeyMatch = rawContent.match(/(?:---ANSWER KEY---|---ANSWERS---)([\s\S]*?)(?=---INTERACTIVE|---END|$)/i);
  if (aKeyMatch) answerKey = aKeyMatch[1].trim();

  // 2. Extract Metadata (Title/Type)
  const titleMatch = rawContent.match(/---TITLE---[\s\S]*?:?\s*([\s\S]*?)(?=---)/i);
  if (titleMatch) {
    title = titleMatch[1]
      .replace(/<\/?[^>]+(>|$)/g, '') // strip HTML
      .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
      .replace(/\*(.+?)\*/g, '$1')     // *italic*
      .replace(/__(.+?)__/g, '$1')     // __bold__
      .replace(/_(.+?)_/g, '$1')       // _italic_
      .replace(/^#+\s*/gm, '')         // # headings
      .replace(/`(.+?)`/g, '$1')       // `code`
      .trim();
  }

  const typeMatch = rawContent.match(/---TYPE:\s*([A-Z\s]+)---/i);
  if (typeMatch) type = typeMatch[1].trim();

  // 3. Parse Metadata from Teacher Notes
  const levelMatch = teacherNotes.match(/Level:\s*([A-Z0-9\+]+)/i);
  if (levelMatch) level = levelMatch[1].trim();

  const targetMatch = teacherNotes.match(/Target:\s*(.*?)(?=\n|$)/i);
  if (targetMatch) target = targetMatch[1].trim();

  // Extract objectives
  const objectivesMatch = teacherNotes.match(/Objectives?:?([\s\S]*?)(?=\n\n|Instructions?|$)/i);
  if (objectivesMatch) {
    objectives = objectivesMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(line => line.length > 5 && !line.toLowerCase().includes('instructions') && !line.toLowerCase().includes('type:') && !line.toLowerCase().includes('topic:'));
  }

  // 4. Clean Teacher Notes for Display
  teacherNotes = teacherNotes
    .replace(/Level:\s*[A-Z0-9\+]+\s*/gi, '')
    .replace(/Target:\s*.*?(\n|$)/gi, '')
    .replace(/Objectives?:?[\s\S]*?(?=\n\n|Instructions?:|---|$)/gi, '')
    .replace(/Instructions?:?\s*/gi, '')
    .replace(/\*\*/g, '') 
    .trim();

  return { title, type, teacherNotes, studentContent, answerKey, level, target, objectives };
};

// --- SUB-COMPONENTS ---

const EditorToolbar = ({ onCmd, isEditing, toggleEdit }: { onCmd: (cmd: string) => void, isEditing: boolean, toggleEdit: () => void }) => (
  <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 shadow-sm flex justify-between items-center w-full shrink-0">
    <div className="flex items-center gap-2">
      <div className="flex bg-gray-100 rounded-lg p-1">
          <button onMouseDown={(e) => { e.preventDefault(); onCmd('bold'); }} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all" title="Bold"><Bold size={16}/></button>
          <button onMouseDown={(e) => { e.preventDefault(); onCmd('italic'); }} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all" title="Italic"><Italic size={16}/></button>
          <button onMouseDown={(e) => { e.preventDefault(); onCmd('insertUnorderedList'); }} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all" title="List"><List size={16}/></button>
      </div>
      <div className="w-px h-6 bg-gray-200 mx-2" />
      <span className={`text-[10px] font-bold uppercase tracking-widest ${isEditing ? 'text-coral' : 'text-gray-400'}`}>{isEditing ? 'EDITING MODE' : 'VIEWING MODE'}</span>
    </div>

    <button 
      onClick={toggleEdit} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${isEditing ? 'bg-black text-white shadow-lg transform scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    >
      {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
      {isEditing ? 'DONE' : 'EDIT'}
    </button>
  </div>
);

const TeacherNotesSection = ({ 
  parsed, 
  contentRef, 
  isEditing, 
  includeNotes, 
  setIncludeNotes,
  combinedExtraction
}: any) => {
  const level = combinedExtraction?.level || parsed?.level || 'B1';
  const target = parsed?.target || combinedExtraction?.topic || 'General';
  const objectives = parsed?.objectives || [];

  return (
    <div className={`w-full max-w-[850px] rounded-2xl p-6 relative group transition-all ${isEditing ? 'bg-blue-50 border border-blue-200' : 'bg-blue-50/50 border border-blue-100'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-black text-blue-600 uppercase flex items-center gap-2"><Info size={14} /> Teacher's Notes</h3>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeNotes ? 'bg-blue-500 border-blue-500' : 'bg-white border-blue-200'}`}>
            {includeNotes && <Check size={10} className="text-white" strokeWidth={4} />}
          </div>
          <input type="checkbox" className="hidden" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} />
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Share in Print</span>
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-100 rounded-full text-[10px] font-bold text-blue-800 shadow-sm">
            <span className="text-blue-400 uppercase tracking-wider text-[9px]">LEVEL:</span> {level}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-100 rounded-full text-[10px] font-bold text-blue-800 shadow-sm">
            <span className="text-blue-400 uppercase tracking-wider text-[9px]">TARGET:</span> {target}
          </span>
        </div>

        {objectives.length > 0 && (
          <div>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Sparkles size={10}/> Objectives:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-900/90 font-medium">
              {objectives.map((obj: string, i: number) => <li key={i}>{obj}</li>)}
            </ul>
          </div>
        )}

        <div 
          ref={contentRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          className="text-sm text-blue-900/90 leading-relaxed font-medium outline-none whitespace-pre-wrap"
        >
          {parsed.teacherNotes || 'Add instructions here...'}
        </div>
      </div>
    </div>
  );
};

const StudentContentSection = ({ 
  parsed, 
  contentRef, 
  titleRef, 
  isEditing 
}: any) => {
  return (
    <div className={`w-full max-w-[850px] bg-white shadow-xl shadow-gray-200/60 border border-gray-200 rounded-sm relative flex flex-col transition-all ${isEditing ? 'ring-4 ring-coral/5' : ''}`}>
      <div className="px-16 pt-16 pb-8 border-b border-gray-100 mb-8 text-center relative">
        <h1 
          ref={titleRef} 
          contentEditable={isEditing} 
          suppressContentEditableWarning 
          className={`text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2 outline-none ${isEditing ? 'border-b-2 border-gray-200 hover:border-coral transition-colors' : ''}`}
        >
          {parsed.title}
        </h1>
        <div className="flex justify-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span>Student Worksheet</span>
        </div>
      </div>

      <div className="px-16 pb-16 relative">
        <div 
          ref={contentRef} 
          contentEditable={isEditing} 
          suppressContentEditableWarning 
          className={`prose prose-lg max-w-none text-gray-800 font-medium leading-normal focus:outline-none min-h-[200px] break-words overflow-wrap-break-word ${isEditing ? 'cursor-text' : ''} [&_p]:my-1 [&_br]:leading-tight`} 
          dangerouslySetInnerHTML={{ 
            __html: marked.parse(
              (parsed.studentContent || '')
                .replace(/\n/g, '  \n')
                .replace(/([A-D])\.\s+/g, '\n   $1. ')
            ) 
          }}
        />
        
        {!parsed.studentContent && !isEditing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-300 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} /> No student content available
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const AnswerKeySection = ({ 
  parsed, 
  contentRef, 
  isEditing, 
  includeKey, 
  setIncludeKey 
}: any) => {
  return (
    <div className={`w-full max-w-[850px] rounded-2xl p-6 relative transition-all ${isEditing ? 'bg-gray-50 border border-gray-300' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
        <h3 className="text-xs font-black text-gray-500 uppercase flex items-center gap-2"><Key size={14} className="text-coral" /> Answer Key</h3>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeKey ? 'bg-coral border-coral' : 'bg-white border-gray-300'}`}>
            {includeKey && <Check size={10} className="text-white" strokeWidth={4} />}
          </div>
          <input type="checkbox" className="hidden" checked={includeKey} onChange={e => setIncludeKey(e.target.checked)} />
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Share in Print</span>
        </label>
      </div>
      
      <div 
        ref={contentRef} 
        contentEditable={isEditing} 
        suppressContentEditableWarning 
        className={`prose prose-sm text-gray-600 leading-relaxed columns-2 outline-none min-h-[40px] ${isEditing ? 'cursor-text' : ''}`} 
        dangerouslySetInnerHTML={{ __html: marked.parse(parsed.answerKey || '') }} 
      />
    </div>
  );
};

// --- MAIN COMPONENT ---

export const WorkbenchPanel: React.FC = () => {
  const { user } = useAuth();
  const { workbench, updateWorkbench, setWorkbench, workflowStage, combinedExtraction, selectedDraftType } = useStudio();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeKey, setIncludeKey] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEnhanceMenu, setShowEnhanceMenu] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<{original: string, new: string, summary: string} | null>(null);
  const [pendingEnhancementType, setPendingEnhancementType] = useState<string | null>(null);
  const [showBuildLog, setShowBuildLog] = useState(false);
  
  // Hydrate workbench from navigation state (editActivity)
  useEffect(() => {
    const state = location.state as { editActivity?: any };
    if (state?.editActivity) {
      const activity = state.editActivity;
      // Always build content with the stored activity.title so it displays correctly
      const cleanTitle = (activity.title || 'Untitled Activity')
        .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
        .replace(/__(.+?)__/g, '$1').replace(/_(.+?)_/g, '$1')
        .replace(/^#+\s*/gm, '').replace(/`(.+?)`/g, '$1').trim();
      let baseContent = activity.rawContent || '';
      if (baseContent) {
        // Replace whatever title is in rawContent with the canonical stored title
        baseContent = baseContent.replace(/---TITLE---[\s\S]*?(?=---)/i, `---TITLE---\n${cleanTitle}\n\n`);
      } else {
        baseContent = `---TITLE---\n${cleanTitle}\n\n---TYPE: ${activity.type || 'Custom'}---\n\n---TEACHER NOTES---\n${activity.teacherNotes || ''}\n\n---STUDENT CONTENT---\n${activity.studentContent || ''}\n\n---ANSWER KEY---\n${activity.answerKey || ''}`;
      }
      const workbenchItem: any = {
        ...activity,
        id: activity.id,
        title: cleanTitle,
        content: baseContent,
        status: activity.status as 'draft' | 'approved',
        sourceIds: [],
        lastModified: Date.now()
      };
      setWorkbench([workbenchItem]);
      window.history.replaceState({}, document.title);
    }
  }, [location, setWorkbench]);

  const activeItem = workbench && workbench.length > 0 ? workbench[0] : null;
  const parsed = useMemo(() => activeItem ? parseActivityContent(activeItem.content) : null, [activeItem?.content]);
  
  const titleRef = useRef<HTMLHeadingElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef<HTMLDivElement>(null);
  const enhanceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (enhanceMenuRef.current && !enhanceMenuRef.current.contains(e.target as Node)) setShowEnhanceMenu(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const execCmd = (cmd: string) => document.execCommand(cmd, false);

  const handleEnhance = async (enhancementType: string) => {
    if (!activeItem || !parsed) return;
    setIsEnhancing(true);
    setShowEnhanceMenu(false);
    setPendingEnhancementType(enhancementType);
    try {
      const item = activeItem as any;
      const response = await fetch('/.netlify/functions/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enhancementType,
          studentContent: parsed.studentContent,
          activityType: item.activityType || selectedDraftType || parsed.type || 'mixed',
          level: item.level || parsed.level || 'B1',
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.tokensUsed && user?.uid) {
        await trackTokenUsage(user.uid, data.tokensUsed, 'enhance');
      }
      setPendingDiff({ original: parsed.studentContent, new: data.enhanced, summary: data.summary });
    } catch (error) {
      toast.error("Enhance failed");
      setPendingEnhancementType(null);
    } finally {
      setIsEnhancing(false);
    }
  };

  const applyEnhancement = () => {
    if (!pendingDiff || !activeItem || !parsed) return;
    const newContent = `---TITLE---\n${parsed.title}\n\n---TYPE: ${parsed.type}---\n\n---TEACHER NOTES---\n${parsed.teacherNotes}\n\n---STUDENT CONTENT---\n${pendingDiff.new}\n\n---ANSWER KEY---\n${parsed.answerKey}`;

    // Write Build Log entry
    const existingLog: BuildLogEntry[] = (activeItem as any).buildLog || [];
    const existingEnhancements: string[] = (activeItem as any).enhancements || [];
    const newEntry: BuildLogEntry = {
      timestamp: Date.now(),
      action: 'enhanced',
      detail: pendingDiff.summary || pendingEnhancementType || 'Enhancement applied',
      actor: 'teacher',
      meta: { enhancementType: pendingEnhancementType || undefined },
    };

    updateWorkbench({
      ...activeItem,
      content: newContent,
      buildLog: [...existingLog, newEntry],
      enhancements: [...new Set([...existingEnhancements, pendingEnhancementType || ''])].filter(Boolean),
    } as any);

    setPendingDiff(null);
    setPendingEnhancementType(null);
    toast.success("Changes Applied");
  };

  const processSave = async (targetStatus: 'draft' | 'approved') => {
    if (!user || !activeItem || !parsed) return;
    setIsSaving(true);
    try {
      const finalTitle = titleRef.current?.innerText || parsed.title;
      const item = activeItem as any; // Cast to access extended properties

      // Use existing interactive data only — no auto-conversion on save
      const interactiveData = parseInteractiveData(activeItem.content) || item.interactiveData || null;

      // IMPORTANT: Preserve existing metadata from activeItem
      const payload = {
        title: finalTitle,
        status: targetStatus,
        teacherNotes: notesRef.current?.innerText || item.teacherNotes || parsed.teacherNotes,
        studentContent: docRef.current?.innerHTML || item.studentContent || parsed.studentContent,
        answerKey: keyRef.current?.innerText || item.answerKey || parsed.answerKey,
        rawContent: activeItem.content || item.rawContent, // Prefer current content

        // PRESERVE existing values first, fallback to extraction/parsing
        level: item.level || combinedExtraction?.level || parsed.level || 'B1',
        topic: item.topic || combinedExtraction?.topic || parsed.target || 'General',
        activityType: item.activityType || selectedDraftType || parsed.type || 'mixed',
        category: item.category || selectedDraftType || parsed.type || 'mixed',

        // PRESERVE source information
        source: item.source || {
          publisher: combinedExtraction?.allTags?.publisher || '',
          bookTitle: combinedExtraction?.allTags?.bookTitle || '',
          pages: [],
          pageCount: combinedExtraction?.pageCount || 0,
        },

        interactiveData,

        // Timestamps
        createdAt: item.createdAt || Date.now(),
        updatedAt: Date.now(),
        isFavorite: item.isFavorite || false,
        userId: user.uid,

        // Build Log — append save/publish entry
        buildLog: [
          ...(item.buildLog || []),
          {
            timestamp: Date.now(),
            action: targetStatus === 'approved' ? 'published' : 'saved',
            detail: targetStatus === 'approved' ? 'Published' : 'Saved as Draft',
            actor: 'teacher' as const,
          }
        ],
        enhancements: item.enhancements || [],
      };

      if (activeItem.id.startsWith('w-')) {
          const newId = await saveActivity(user.uid, payload);
          // Merge payload back into activeItem to keep metadata in UI state
          const updatedItem = { ...item, ...payload, id: newId, status: targetStatus };
          setWorkbench(prev => prev.map(i => i.id === activeItem.id ? updatedItem : i));
      } else {
          await updateActivity(activeItem.id, payload);
          const updatedItem = { ...item, ...payload, status: targetStatus, title: finalTitle };
          updateWorkbench(updatedItem);
      }

      if (targetStatus === 'draft') {
        toast.success('Draft saved to My Activities', {
          duration: 2000,
          style: { background: '#FEF3C7', color: '#92400E', fontWeight: '600' },
          icon: '📝',
        });
      } else {
        toast.success('Activity published!', {
          duration: 2000,
          style: { background: '#D1FAE5', color: '#065F46', fontWeight: '600' },
          icon: '🎉',
        });
      }
      // Navigate to My Activities after a short delay so the toast is visible
      // Keep isSaving=true until navigation to prevent double-save
      setTimeout(() => navigate('/activities'), 1200);
      return; // skip finally reset on success

    } catch (e) {
        console.error(e);
        toast.error("Save failed");
        setIsSaving(false);
    }
  };

  const handleSaveDraft = () => processSave('draft');
  const handlePublish = () => processSave('approved');

  const handlePrint = () => {
    const finalTitle = titleRef.current?.innerText || parsed?.title || 'Activity';
    const win = window.open('', '', 'width=800,height=900');
    if (win) {
      win.document.write(`<html><head><title>${finalTitle}</title><script src="https://cdn.tailwindcss.com"></script></head><body class="p-10 font-sans text-gray-900">
        ${includeNotes && notesRef.current ? `<div class="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl"><h3 class="text-xs font-bold text-blue-500 uppercase mb-2">Teacher Notes</h3><div class="prose prose-sm text-blue-900">${notesRef.current.innerHTML}</div></div>` : ''}
        <h1 class="text-3xl font-black mb-8 text-center uppercase">${finalTitle}</h1>
        <div class="prose max-w-none mb-12">${docRef.current?.innerHTML}</div>
        ${includeKey && keyRef.current ? `<div class="mt-12 pt-8 border-t-2 border-dashed border-gray-300 page-break-before"><h2 class="text-xl font-bold mb-4 uppercase">Answer Key</h2><div class="prose max-w-none text-gray-600 columns-2">${keyRef.current.innerHTML}</div></div>` : ''}
      </body></html>`);
      win.document.close(); setTimeout(() => { win.print(); win.close(); }, 500);
    }
  };

  if (!activeItem || !parsed) {
     if (workflowStage === 'drafting') {
        return (
           <div className="h-full flex flex-col bg-[#F3F4F6] items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <RefreshCw className="w-8 h-8 text-coral animate-spin-slow" />
              </div>
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-2">Workbench Ready</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-xs leading-relaxed">
                Waiting for content from the Drafting Partner...
              </p>
           </div>
        );
     }
     return null; 
  }

  const containerClass = isFullScreen ? "fixed inset-0 z-50 bg-[#F3F4F6] w-screen h-screen flex flex-col" : "h-full flex flex-col bg-[#F3F4F6] relative overflow-hidden";

  return (
    <div className={containerClass}>
      {/* 1. HEADER (Two Rows) */}
      <div className="bg-white border-b border-gray-200 shrink-0 shadow-sm z-[60]">
        {/* BREADCRUMB */}
        <div className="px-6 pt-2.5 pb-0 flex items-center gap-1.5">
          <button
            onClick={() => navigate('/activities')}
            className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-coral transition-colors"
          >
            My Activities
          </button>
          <span className="text-[9px] text-gray-300 font-bold">›</span>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            {combinedExtraction?.allTags?.bookTitle || (activeItem as any)?.source?.bookTitle || 'Studio'}
          </span>
          <span className="text-[9px] text-gray-300 font-bold">›</span>
          <span className="text-[9px] font-black text-coral uppercase tracking-widest truncate max-w-[200px]">
            {parsed?.title || 'Draft'}
          </span>
        </div>

        {/* ROW 1: Info */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Workbench</h2>
            <span className="px-2 py-0.5 bg-coral/10 text-coral rounded text-[9px] font-black uppercase tracking-wider">
              {formatActivityType(selectedDraftType || parsed.type)}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {combinedExtraction?.allTags?.bookTitle || 'Custom'}
              {combinedExtraction?.allTags?.unitTags?.[0] && ` • ${combinedExtraction.allTags.unitTags[0]}`}
            </span>
          </div>
          <div className="text-sm font-black text-gray-900">{parsed.title}</div>
        </div>
        
        {/* ROW 2: Actions */}
        <div className="px-6 py-2 flex items-center justify-between bg-gray-50/50">
          {/* Left: Enhance */}
          <div className="relative" ref={enhanceMenuRef}>
            <button onClick={() => setShowEnhanceMenu(!showEnhanceMenu)} disabled={isEnhancing} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest">
              {isEnhancing ? <RefreshCw className="animate-spin" size={14} /> : <Wand2 size={14} />} Enhance
            </button>
            {showEnhanceMenu && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[70]">
                <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Adapt This Activity</p>
                </div>
                {ENHANCE_OPTIONS.map(({ key, label, Icon, color, bg }) => (
                  <button
                    key={key}
                    onClick={() => handleEnhance(key)}
                    className={`w-full text-left px-4 py-3 ${bg} flex items-center gap-3 transition-colors`}
                  >
                    <Icon size={13} className={color} />
                    <span className="text-[11px] font-bold text-gray-700">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 text-gray-400 hover:text-coral transition-colors rounded-lg hover:bg-white" title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
              {isFullScreen ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
            </button>
            <button onClick={handlePrint} className="p-2 text-gray-400 hover:text-coral transition-colors rounded-lg hover:bg-white" title="Print">
              <Printer size={18}/>
            </button>
            <button onClick={handleSaveDraft} disabled={isSaving} className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
              {isSaving ? <RefreshCw className="animate-spin w-3 h-3" /> : <FileText size={14} />} DRAFT
            </button>
            <button onClick={handlePublish} disabled={isSaving} className="px-5 py-2 bg-coral text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#DC2E4A] shadow-lg shadow-coral/20 flex items-center gap-2">
              {isSaving ? <RefreshCw className="animate-spin w-3 h-3" /> : <Save size={14} />} PUBLISH
            </button>
          </div>
        </div>
      </div>
      
      {/* 2. MAIN SCROLLABLE WORKSPACE */}
      <>
        <EditorToolbar onCmd={execCmd} isEditing={isEditing} toggleEdit={() => setIsEditing(!isEditing)} />

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar flex flex-col items-center gap-8 bg-gray-100/50">
          
          <TeacherNotesSection 
            parsed={parsed} 
            contentRef={notesRef} 
            isEditing={isEditing} 
            includeNotes={includeNotes} 
            setIncludeNotes={setIncludeNotes}
            combinedExtraction={combinedExtraction}
          />
          
          <StudentContentSection 
            parsed={parsed} 
            contentRef={docRef} 
            titleRef={titleRef} 
            isEditing={isEditing} 
          />
          
          <AnswerKeySection
            parsed={parsed}
            contentRef={keyRef}
            isEditing={isEditing}
            includeKey={includeKey}
            setIncludeKey={setIncludeKey}
          />

          {/* BUILD LOG */}
          {(() => {
            const log: BuildLogEntry[] = (activeItem as any)?.buildLog || [];
            if (log.length === 0) return null;
            return (
              <div className="mx-6 mb-4 rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setShowBuildLog(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Build Log</span>
                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[9px] font-black rounded-full">{log.length}</span>
                  </div>
                  {showBuildLog ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>
                {showBuildLog && (
                  <div className="px-5 py-4 bg-white space-y-3">
                    {log.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-base leading-none mt-0.5">{BUILD_LOG_ICONS[entry.action] || '•'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-gray-800 leading-snug">{entry.detail}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-gray-400 uppercase tracking-wider">{formatLogTime(entry.timestamp)}</span>
                            {entry.actor === 'ai' && (
                              <span className="flex items-center gap-0.5 text-[9px] text-indigo-400 font-bold uppercase">
                                <Bot size={9} /> AI
                              </span>
                            )}
                            {entry.actor === 'teacher' && (
                              <span className="flex items-center gap-0.5 text-[9px] text-gray-400 font-bold uppercase">
                                <User size={9} /> You
                              </span>
                            )}
                          </div>
                        </div>
                        {i < log.length - 1 && (
                          <div className="absolute left-[28px] mt-6 w-px h-3 bg-gray-100" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="h-20" />
        </div>
      </>

      {/* COMPARISON MODAL */}
      {pendingDiff && (
        <div className="absolute inset-0 z-[100] bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <SplitSquareHorizontal className="text-coral" size={18}/> Review Changes
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setPendingDiff(null)} className="px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-200 transition-colors">Discard</button>
                <button onClick={applyEnhancement} className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-coral text-white hover:bg-[#DC2E4A] shadow-lg transition-all active:scale-95">Apply Changes</button>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 overflow-hidden">
              {/* ORIGINAL PANEL */}
              <div className="flex flex-col border-r border-gray-200 bg-red-50/20 overflow-hidden">
                <div className="px-8 py-3 border-b border-red-100 bg-red-50 shrink-0">
                  <span className="px-3 py-1 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase tracking-widest border border-red-200">Original</span>
                </div>
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="prose prose-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: marked.parse(pendingDiff.original) }} />
                </div>
              </div>
              {/* ENHANCED PANEL */}
              <div className="flex flex-col bg-green-50/20 overflow-hidden">
                <div className="px-8 py-3 border-b border-green-100 bg-green-50 shrink-0">
                  <span className="px-3 py-1 bg-green-100 text-green-600 rounded text-[9px] font-black uppercase tracking-widest border border-green-200">Enhanced</span>
                </div>
                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                  <div className="prose prose-sm text-gray-900 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: marked.parse(pendingDiff.new) }} />
                  {pendingDiff.summary && (
                    <div className="p-5 bg-white rounded-xl border border-green-200 shadow-lg shrink-0">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={12}/> AI Change Log</p>
                      <div className="prose prose-xs text-gray-600" dangerouslySetInnerHTML={{ __html: pendingDiff.summary }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
