import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace, ChatMessage, WorkbenchItem, SourceMaterial, PageSource, WorkflowStage } from '../types';
import { useAuth } from './AuthContext';
import { uploadPage } from '../services/firestoreService';
import { draftResponse, refineDraft } from '../services/mistralService';
import toast from 'react-hot-toast';

export interface CombinedContent {
  vocabulary: string[];
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDraftType, setSelectedDraftType] = useState<string>('mixed');
  const [isRefining, setIsRefining] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activityConfig, setActivityConfig] = useState<{ questionCount: number; questionFormat: string }>({ questionCount: 10, questionFormat: 'mixed' });
  const [pendingDraftType, setPendingDraftType] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

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

  const buildWorkbenchItem = (id: string, rawContent: string): WorkbenchItem => {
    const titleMatch = rawContent.match(/---TITLE---\s*([\s\S]*?)(?=---)/i);
    const rawTitle = titleMatch ? titleMatch[1].trim() : 'Draft Activity';
    const typeMatch = rawContent.match(/---TYPE:\s*([A-Z\s]+)---/i);
    const actType = typeMatch ? typeMatch[1].trim() : '';
    const bookMatch = sources[0]?.title || '';
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
        detail: `Draft created by AI Partner${actType ? ` · ${actType}` : ''}${bookMatch ? ` · ${bookMatch}` : ''}`,
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
    try {
      const result = await draftResponse(type, partnerInput, sources, workbench, user.uid, user.email, activityConfig);
      setDraftContent(result);
      addMessage({ id: Date.now().toString(), role: 'partner', text: result, timestamp: Date.now() });
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
        updateWorkbench(buildWorkbenchItem(currentDraftId, result));
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
    // First send — add to workbench
    const newId = 'w-' + Math.random().toString(36).substr(2, 9);
    setCurrentDraftId(newId);
    addToWorkbench(buildWorkbenchItem(newId, draftContent));
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
