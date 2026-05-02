import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace, ChatMessage, WorkbenchItem, SourceMaterial, PageSource, WorkflowStage } from '../types';
import { useAuth } from './AuthContext';
import { uploadPage, writePoolSignal, getPoolPreferences, PoolPreferences } from '../services/firestoreService';
import { draftResponse, refineDraft } from '../services/mistralService';
import { ACTIVITY_TYPES } from '../constants/activityTypes';
import toast from 'react-hot-toast';

export interface CombinedContent {
  vocabulary: string[];
  secondaryVocabulary?: string[];
  grammar: string[];
  topic: string;
  level: string;
  ocrTexts: string[];
  pageCount: number;
  allTags: {
    publisher: string;
    bookTitle: string;
    unitTags: string[];
    labelTags: string[];
    pages: Array<{
      unitPage: string | null;
      pageLabel: string | null;
      unitTags: string[];
      labelTags: string[];
    }>;
  };
}

export type CEFRLevel = 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface PoolItem {
  term: string;
  type: 'vocabulary' | 'grammar';
  subtype: 'core' | 'secondary';
  cefrLevel: CEFRLevel;
  pos: string;
  usageCount: number;
}

export interface ActivityVariant {
  id: string;
  timestamp: Date;
  activityType: string;
  cefrLevel: string;
  instruction: string;
  content: string;
  narration: any | null;
}

interface StudioContextType {
  workbench: WorkbenchItem[];
  setWorkbench: React.Dispatch<React.SetStateAction<WorkbenchItem[]>>;
  sources: SourceMaterial[];
  setSources: React.Dispatch<React.SetStateAction<SourceMaterial[]>>;
  currentWorkspace: Workspace | null;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  workflowStage: WorkflowStage;
  setWorkflowStage: (stage: WorkflowStage) => void;
  addToWorkbench: (item: WorkbenchItem) => void;
  updateWorkbench: (item: WorkbenchItem) => void;
  addSource: (source: SourceMaterial) => void;
  addMessage: (msg: ChatMessage) => void;
  uploadNewPage: (pageData: Partial<PageSource>) => Promise<PageSource>;
  combinedExtraction: CombinedContent | null;
  setCombinedExtraction: (content: CombinedContent | null) => void;

  // Drafting Partner State
  partnerInput: string;
  setPartnerInput: (input: string) => void;
  draftContent: string | null;
  draftNarration: any | null;
  isGenerating: boolean;
  handleGenerateDraft: (type?: string) => Promise<void>;
  sendDraftToWorkbench: () => void;
  currentDraftId: string | null;
  selectedDraftType: string;
  isRefining: boolean;
  handleRefineDraft: (refinementRequest: string) => Promise<void>;
  showConfigModal: boolean;
  setShowConfigModal: (show: boolean) => void;
  activityConfig: { questionCount: number; questionFormat: string };
  setActivityConfig: (config: { questionCount: number; questionFormat: string }) => void;
  pendingDraftType: string | null;
  setPendingDraftType: (type: string | null) => void;

  // Activity Type Picker State
  selectedActivityTypeId: string | null;
  setSelectedActivityTypeId: (id: string | null) => void;
  grammarFocus: string;
  setGrammarFocus: (v: string) => void;
  wordBankEnabled: boolean;
  setWordBankEnabled: React.Dispatch<React.SetStateAction<boolean>>;

  // Pool Panel v2
  poolItems: PoolItem[];
  excludedItems: string[];
  alwaysExcludedItems: string[];
  excludeItem: (term: string) => void;
  alwaysExcludeItem: (term: string) => void;
  restoreItem: (term: string) => void;
  restoreAll: () => void;
  addPoolItem: (term: string, type: 'vocabulary' | 'grammar') => void;

  // Variant History
  variants: ActivityVariant[];
  addVariant: (variant: ActivityVariant) => void;
  restoreVariant: (id: string) => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workbench, setWorkbench] = useState<WorkbenchItem[]>([]);
  const [sources, setSources] = useState<SourceMaterial[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>('uploading');
  const [combinedExtraction, setCombinedExtraction] = useState<CombinedContent | null>(null);

  // New Partner States
  const [partnerInput, setPartnerInput] = useState('');
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [draftNarration, setDraftNarration] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDraftType, setSelectedDraftType] = useState<string>('mixed');
  const [isRefining, setIsRefining] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activityConfig, setActivityConfig] = useState<{ questionCount: number; questionFormat: string }>({ questionCount: 8, questionFormat: 'mixed' });
  const [pendingDraftType, setPendingDraftType] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [lastDraftPrompt, setLastDraftPrompt] = useState<string>('');

  // Activity Type Picker State
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState<string | null>(null);
  const [grammarFocus, setGrammarFocus] = useState<string>('');
  const [wordBankEnabled, setWordBankEnabled] = useState(true);

  // Pool Panel v2
  const [poolItems, setPoolItems] = useState<PoolItem[]>([]);
  const [excludedItems, setExcludedItems] = useState<string[]>([]);
  const [alwaysExcludedItems, setAlwaysExcludedItems] = useState<string[]>([]);

  // Variant History
  const [variants, setVariants] = useState<ActivityVariant[]>([]);

  const fireExcludeSignal = (term: string) => {
    if (!user) return;
    writePoolSignal(user.uid, {
      signalType: 'item_excluded',
      materialId: combinedExtraction?.allTags?.bookTitle || null,
      cefrLevel: combinedExtraction?.level || null,
      activityType: null,
      itemA: term,
    });
  };

  const excludeItem = (term: string) => {
    setExcludedItems(prev => prev.includes(term) ? prev : [...prev, term]);
    fireExcludeSignal(term);
  };

  const alwaysExcludeItem = (term: string) => {
    setAlwaysExcludedItems(prev => prev.includes(term) ? prev : [...prev, term]);
    setExcludedItems(prev => prev.includes(term) ? prev : [...prev, term]);
    fireExcludeSignal(term);
  };

  const restoreItem = (term: string) => {
    setExcludedItems(prev => prev.filter(i => i !== term));
    setAlwaysExcludedItems(prev => prev.filter(i => i !== term));
  };

  const restoreAll = () => {
    setExcludedItems([]);
    setAlwaysExcludedItems([]);
  };

  const addPoolItem = (term: string, type: 'vocabulary' | 'grammar') => {
    const trimmed = term.trim();
    if (!trimmed || poolItems.some(i => i.term.toLowerCase() === trimmed.toLowerCase())) return;
    const lvl = (combinedExtraction?.level as CEFRLevel) || 'A1';
    setPoolItems(prev => [...prev, { term: trimmed, type, subtype: 'core', cefrLevel: lvl, pos: '', usageCount: 0 }]);
  };

  const addVariant = (variant: ActivityVariant) => {
    setVariants(prev => [variant, ...prev]);
  };

  const restoreVariant = (id: string) => {
    const v = variants.find(v => v.id === id);
    if (!v) return;
    setDraftContent(v.content);
    setDraftNarration(v.narration);
  };

  const addToWorkbench = (item: WorkbenchItem) => {
    setWorkbench(prev => [item, ...prev]);
  };

  const updateWorkbench = (item: WorkbenchItem) => {
    setWorkbench(prev => prev.map(i => i.id === item.id ? item : i));
  };

  const addSource = (source: SourceMaterial) => {
    setSources(prev => [source, ...prev]);
  };

  const addMessage = (msg: ChatMessage) => setMessages(prev => [...prev, msg]);

  // Auto-populate grammarFocus when combinedExtraction updates
  useEffect(() => {
    if (combinedExtraction?.grammar?.length) {
      setGrammarFocus(combinedExtraction.grammar[0]);
    }
  }, [combinedExtraction]);

  // Auto-populate poolItems from combinedExtraction, using teacher-selected level as default CEFR
  useEffect(() => {
    if (!combinedExtraction) { setPoolItems([]); return; }
    const VALID_CEFR: CEFRLevel[] = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const lvl: CEFRLevel = VALID_CEFR.includes(combinedExtraction.level as CEFRLevel)
      ? (combinedExtraction.level as CEFRLevel)
      : 'B1';
    const items: PoolItem[] = [
      ...(combinedExtraction.vocabulary || []).map(t => ({
        term: t, type: 'vocabulary' as const, subtype: 'core' as const, cefrLevel: lvl, pos: '', usageCount: 0
      })),
      ...(combinedExtraction.secondaryVocabulary || []).map(t => ({
        term: t, type: 'vocabulary' as const, subtype: 'secondary' as const, cefrLevel: lvl, pos: '', usageCount: 0
      })),
      ...(combinedExtraction.grammar || []).map(t => ({
        term: t, type: 'grammar' as const, subtype: 'core' as const, cefrLevel: lvl, pos: '', usageCount: 0
      })),
    ];
    setPoolItems(items);
    // Reset session exclusions and variant history when a new material is loaded
    setExcludedItems([]);
    setVariants([]);
  }, [combinedExtraction]);

  const uploadNewPage = async (pageData: Partial<PageSource>) => {
    if (!user) throw new Error("User must be logged in to upload pages");
    return await uploadPage(user.uid, pageData);
  };

  // Strip markdown formatting from titles (e.g. **"Title"** → Title)
  const stripMarkdown = (text: string): string =>
    text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/^#+\s*/gm, '')
      .replace(/`(.+?)`/g, '$1')
      .trim();

  const buildWorkbenchItem = (id: string, rawContent: string, userPrompt?: string): WorkbenchItem => {
    // Try standard ---TITLE--- format first
    const titleMatch = rawContent.match(/---TITLE---\s*([\s\S]*?)(?=---)/i);
    const fromMarker = titleMatch?.[1]?.trim();
    // Fallback: AI sometimes skips TITLE marker and uses ---Actual Title--- directly
    const firstBlockMatch = rawContent.match(/^---([^-\n][^\n]{2,}?)---/m);
    const fromFirstBlock = firstBlockMatch?.[1]?.trim();
    const rawTitle = (fromMarker && fromMarker.toUpperCase() !== 'TITLE') ? fromMarker : (fromFirstBlock || 'Draft Activity');
    const typeMatch = rawContent.match(/---TYPE:\s*([A-Z\s]+)---/i);
    const actType = typeMatch ? typeMatch[1].trim() : '';
    const bookMatch = sources[0]?.title || '';
    const promptLabel = userPrompt
      ? `"${userPrompt.length > 60 ? userPrompt.slice(0, 57) + '...' : userPrompt}"`
      : null;
    return {
      id,
      title: stripMarkdown(rawTitle),
      content: rawContent,
      status: 'draft',
      sourceIds: [],
      lastModified: Date.now(),
      buildLog: [{
        timestamp: Date.now(),
        action: 'drafted' as const,
        detail: promptLabel
          ? `AI draft: ${promptLabel}${bookMatch ? ` · ${bookMatch}` : ''}`
          : `Draft created by AI Partner${actType ? ` · ${actType}` : ''}${bookMatch ? ` · ${bookMatch}` : ''}`,
        actor: 'ai' as const,
      }],
    };
  };

  const handleGenerateDraft = async (type: string = 'Custom') => {
    if (!user || (!partnerInput.trim() && type === 'Custom') || isGenerating || sources.length === 0) return;

    setSelectedDraftType(type);
    setIsGenerating(true);
    // Reset so the panel shows the ADD TO WORKBENCH button for the new draft
    setCurrentDraftId(null);
    setDraftContent(null);
    setDraftNarration(null);
    setLastDraftPrompt(partnerInput || type);

    // Resolve activity type template if one is selected
    const resolveTemplate = (template: string): string => {
      const vocab = (combinedExtraction?.vocabulary || []).slice(0, 15).join(', ');
      return template
        .replace('[TENSE]', grammarFocus || combinedExtraction?.grammar?.[0] || 'target tense')
        .replace('[VOCABULARY SET]', vocab || 'target vocabulary')
        .replace('[TOPIC]', combinedExtraction?.topic || 'the lesson topic')
        .replace('[WORD BANK: YES/NO]', wordBankEnabled ? 'yes' : 'no');
    };

    const selectedType = ACTIVITY_TYPES.find(t => t.id === selectedActivityTypeId);
    const activityTypeMeta = selectedType ? {
      templateInstruction: resolveTemplate(selectedType.promptTemplate),
      typeId: selectedType.id,
      typeName: selectedType.name,
      format: selectedType.format,
      category: selectedType.category,
    } : undefined;

    // Fetch cross-session preferences (non-blocking — null if first use or error)
    const poolPrefs = await getPoolPreferences(user.uid).catch(() => null);
    const buildCalibrationHint = (prefs: PoolPreferences | null, level: string | undefined): string => {
      if (!prefs || !level) return '';
      const cal = prefs.cefrCalibration[level];
      if (!cal) return '';
      const notes: string[] = [];
      if (cal.acceptRate < 0.4) notes.push(`recent data shows this teacher finds ${level} activities too challenging — aim for a slightly more accessible register`);
      if (cal.editDepthAvg > 0.5) notes.push(`this teacher tends to heavily edit ${level} activities — draft with simpler structure and cleaner sentence patterns`);
      return notes.join('; ');
    };
    const poolPrefsHints = poolPrefs ? {
      preferredActivityTypes: poolPrefs.preferredActivityTypes.length > 0 ? poolPrefs.preferredActivityTypes : undefined,
      cefrCalibrationHint: buildCalibrationHint(poolPrefs, combinedExtraction?.level) || undefined,
    } : undefined;

    try {
      const allExcluded = Array.from(new Set([
        ...excludedItems,
        ...alwaysExcludedItems,
        ...(poolPrefs?.alwaysExcludedItems || []),
      ]));
      const result = await draftResponse(type, partnerInput, sources, workbench, user.uid, user.email, activityConfig, activityTypeMeta, allExcluded, combinedExtraction?.level || undefined, poolPrefsHints);
      setDraftContent(result.content);
      setDraftNarration(result.narration);
      addMessage({ id: Date.now().toString(), role: 'partner', text: result.content, timestamp: Date.now() });
      if (type === 'Custom') setPartnerInput('');
    } catch (error) {
      toast.error("Failed to generate draft.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineDraft = async (refinementRequest: string) => {
    if (!user || !draftContent || !refinementRequest.trim() || isRefining) return;

    setIsRefining(true);
    try {
      const result = await refineDraft(draftContent, refinementRequest, sources, user.uid, user.email);
      setDraftContent(result);
      addMessage({ id: Date.now().toString(), role: 'partner', text: result, timestamp: Date.now() });
      setPartnerInput('');

      // If already sent to workbench, auto-update the existing item with the refined content
      if (currentDraftId) {
        const existingItem = workbench.find(i => i.id === currentDraftId);
        const existingLog: any[] = (existingItem as any)?.buildLog || [];
        const baseItem = buildWorkbenchItem(currentDraftId, result, lastDraftPrompt || undefined);
        const refinedLabel = refinementRequest.length > 60
          ? `"${refinementRequest.slice(0, 57)}..."`
          : `"${refinementRequest}"`;
        updateWorkbench({
          ...baseItem,
          buildLog: [...existingLog, {
            timestamp: Date.now(),
            action: 'refined' as const,
            detail: `Refined: ${refinedLabel}`,
            actor: 'teacher' as const,
          }],
        } as any);
        toast.success("Workbench updated!");
      } else {
        toast.success("Draft refined — send it to the Workbench when ready.");
      }
    } catch (error) {
      toast.error("Failed to refine draft.");
    } finally {
      setIsRefining(false);
    }
  };

  const sendDraftToWorkbench = () => {
    if (!draftContent) return;
    if (currentDraftId) {
      // Already sent — clear the preview panel ready for a new draft
      setDraftContent(null);
      setCurrentDraftId(null);
      return;
    }
    // First send — add to workbench, carrying activity type metadata
    const newId = 'w-' + Math.random().toString(36).substr(2, 9);
    setCurrentDraftId(newId);
    const selectedType = ACTIVITY_TYPES.find(t => t.id === selectedActivityTypeId);
    const baseItem = buildWorkbenchItem(newId, draftContent, lastDraftPrompt || undefined);
    const enrichedItem: any = {
      ...baseItem,
      activityTypeId: selectedType?.id || null,
      activityTypeName: selectedType?.name || null,
      activityCategory: selectedType?.category || null,
      activityFormat: selectedType?.format || null,
    };
    addToWorkbench(enrichedItem);
    addVariant({
      id: Date.now().toString(),
      timestamp: new Date(),
      activityType: draftNarration?.activityType || selectedDraftType,
      cefrLevel: combinedExtraction?.level || '',
      instruction: lastDraftPrompt,
      content: draftContent,
      narration: draftNarration,
    });
    toast.success("Activity added to Workbench!");
  };

  return (
    <StudioContext.Provider value={{
      workbench,
      setWorkbench,
      sources,
      setSources,
      currentWorkspace,
      messages,
      setMessages,
      workflowStage,
      setWorkflowStage,
      addToWorkbench,
      updateWorkbench,
      addSource,
      addMessage,
      uploadNewPage,
      combinedExtraction,
      setCombinedExtraction,
      partnerInput,
      setPartnerInput,
      draftContent,
      draftNarration,
      isGenerating,
      handleGenerateDraft,
      sendDraftToWorkbench,
      currentDraftId,
      selectedDraftType,
      isRefining,
      handleRefineDraft,
      showConfigModal,
      setShowConfigModal,
      activityConfig,
      setActivityConfig,
      pendingDraftType,
      setPendingDraftType,
      selectedActivityTypeId,
      setSelectedActivityTypeId,
      grammarFocus,
      setGrammarFocus,
      wordBankEnabled,
      setWordBankEnabled,
      poolItems,
      excludedItems,
      alwaysExcludedItems,
      excludeItem,
      alwaysExcludeItem,
      restoreItem,
      restoreAll,
      addPoolItem,
      variants,
      addVariant,
      restoreVariant,
    }}>
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
