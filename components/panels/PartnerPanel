import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { 
  Sparkles, ArrowRight, Check, Plus, BookOpen, 
  ListChecks, PenTool, MessageCircle, Feather, Layers, ArrowUp, RefreshCw, X, Settings
} from 'lucide-react';
import { marked } from 'marked';

export const PartnerPanel: React.FC = () => {
  const { 
    partnerInput, 
    setPartnerInput, 
    handleGenerateDraft, 
    isGenerating, 
    draftContent,
    sendDraftToWorkbench,
    sources,
    workbench,
    isRefining,
    handleRefineDraft,
    showConfigModal,
    setShowConfigModal,
    activityConfig,
    setActivityConfig,
    pendingDraftType,
    setPendingDraftType,
  } = useStudio();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasMaterial = sources.length > 0;

  useEffect(() => {
    if (draftContent && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [draftContent]);

  // --- PREVIEW CLEANER ---
  // Hides the "---TEACHER NOTES---" tags and renders nice HTML for the chat
  const renderCleanPreview = (rawText: string) => {
    // 1. Remove the Interactive JSON block so it doesn't show in chat
    const textOnly = rawText.split('---INTERACTIVE DATA---')[0];
    
    // 2. Add line breaks to prevent merging (e.g. "WorksheetTEACHER")
    let cleanText = textOnly
      .replace(/---TYPE:/g, '\n\n**TYPE:**')
      .replace(/---TEACHER NOTES---/g, '\n\n**TEACHER NOTES**\n')
      .replace(/---STUDENT CONTENT---/g, '\n\n**STUDENT CONTENT**\n')
      .replace(/---ANSWER KEY---/g, '\n\n**ANSWER KEY**\n')
      .replace(/---TITLE---/g, '\n# ');

    return { __html: marked.parse(cleanText) };
  };

  const quickActions = [
    { id: 'reading', icon: BookOpen, label: 'Reading' },
    { id: 'vocabulary', icon: ListChecks, label: 'Vocab' },
    { id: 'grammar', icon: PenTool, label: 'Grammar' },
    { id: 'speaking', icon: MessageCircle, label: 'Speaking' },
    { id: 'writing', icon: Feather, label: 'Writing' },
    { id: 'mixed', icon: Layers, label: 'Mixed' }
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="text-coral" size={16} />
          <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Draft Partner</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasMaterial ? (isGenerating ? 'bg-coral animate-pulse' : 'bg-success') : 'bg-gray-300'}`}></div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{hasMaterial ? (isGenerating ? 'Drafting...' : 'Ready') : 'Awaiting Source'}</span>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 no-scrollbar">
        
        {/* Guidance Bubble - UX Improvement */}
        {hasMaterial && !isGenerating && !draftContent && workbench.length === 0 && (
          <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-900 font-bold mb-1">
                  Ready to create!
                </p>
                <p className="text-xs text-blue-700/80 leading-relaxed">
                  I've analyzed your source material. Select a <span className="font-bold">quick action</span> below or type a custom instruction to generate your first activity.
                </p>
              </div>
            </div>
          </div>
        )}

        {!draftContent ? (
           workbench.length === 0 && !hasMaterial ? (
             <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
               <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                 <Sparkles className="text-gray-400" size={20} />
               </div>
               <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                 Upload material first...
               </p>
             </div>
           ) : null
        ) : (
          <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
            {/* AI MESSAGE CARD */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
              <div className="bg-coral/5 px-4 py-2 border-b border-coral/10 flex justify-between items-center">
                 <span className="text-[10px] font-black text-coral uppercase tracking-widest flex items-center gap-2">
                   <Check size={12} strokeWidth={4} /> Draft Generated
                 </span>
              </div>
              
              <div className="p-5">
                {/* PREVIEW CONTENT */}
                <div className={`prose prose-sm max-w-none text-gray-600 transition-all duration-500 ${isExpanded ? '' : 'max-h-[240px] overflow-hidden relative'}`}>
                   <div dangerouslySetInnerHTML={renderCleanPreview(draftContent)} />
                   {!isExpanded && <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />}
                </div>

                {/* SHOW FULL DRAFT BUTTON - NOW GRAY/BLACK */}
                <button 
                  onClick={() => setIsExpanded(!isExpanded)} 
                  className="mt-4 w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors border-t border-gray-50 flex items-center justify-center gap-1"
                >
                  {isExpanded ? 'Collapse' : 'Show Full Draft'}
                </button>
              </div>

              {/* ACTION FOOTER - TO WORKBENCH BUTTON */}
              <div className="p-2 bg-gray-50 border-t border-gray-100">
                 <button 
                   onClick={sendDraftToWorkbench}
                   className="w-full py-4 bg-coral text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#DC2E4A] transition-all shadow-lg shadow-coral/20 flex items-center justify-center gap-2 active:scale-[0.99]"
                 >
                   <Plus size={14} strokeWidth={3} /> ADD TO WORKBENCH
                 </button>
              </div>
            </div>
            <div ref={chatEndRef} />
          </div>
        )}
        
        {isGenerating && (
          <div className="flex gap-3 animate-in fade-in">
            <div className="w-8 h-8 bg-coral rounded-xl flex items-center justify-center mt-1 shadow-md shadow-coral/10">
              <Sparkles className="text-white w-4 h-4 animate-spin-slow" />
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-coral/40 rounded-full animate-bounce"/>
              <span className="w-1.5 h-1.5 bg-coral/60 rounded-full animate-bounce delay-100"/>
              <span className="w-1.5 h-1.5 bg-coral rounded-full animate-bounce delay-200"/>
            </div>
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {quickActions.map((action) => (
            <button 
              key={action.id} 
              onClick={() => {
                setPendingDraftType(action.id);
                setShowConfigModal(true);
              }}
              disabled={!hasMaterial || isGenerating} 
              className="flex flex-col items-center justify-center py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 hover:border-coral/40 hover:text-coral hover:bg-white transition-all disabled:opacity-50 group"
            >
              <action.icon size={14} className="mb-1 text-gray-400 group-hover:text-coral transition-colors" />
              <span className="text-[8px] font-black uppercase tracking-widest">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Free Text Input */}
        <div className="flex gap-2">
          <input 
            type="text" 
            value={partnerInput} 
            disabled={!hasMaterial || isGenerating} 
            onChange={(e) => setPartnerInput(e.target.value)} 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (draftContent) {
                  handleRefineDraft(partnerInput);
                } else {
                  handleGenerateDraft();
                }
              }
            }}
            placeholder={hasMaterial ? "Ask to refine or create..." : "Upload material first..."} 
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:border-coral outline-none disabled:opacity-50 transition-all focus:bg-white" 
          />
          <button 
            onClick={() => {
              if (draftContent) {
                handleRefineDraft(partnerInput);
              } else {
                handleGenerateDraft();
              }
            }}
            disabled={!partnerInput.trim() || isGenerating || isRefining || !hasMaterial} 
            className="w-12 h-12 bg-coral text-white rounded-xl flex items-center justify-center shadow-lg shadow-coral/20 hover:bg-[#DC2E4A] transition-all disabled:opacity-30 active:scale-95"
          >
            {(isGenerating || isRefining) ? <RefreshCw size={20} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={3} />}
          </button>
        </div>
      </div>

      {/* CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-coral" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                  {pendingDraftType ? 'Configure & Generate' : 'Configure Activity'}
                </h3>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            
            {/* Question Count */}
            <div className="mb-6">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Number of Questions</p>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(count => (
                  <button
                    key={count}
                    onClick={() => setActivityConfig({ ...activityConfig, questionCount: count })}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                      activityConfig.questionCount === count
                        ? 'bg-coral text-white shadow-lg shadow-coral/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Question Format */}
            <div className="mb-8">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Question Format</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'multiple-choice', label: 'Multiple Choice' },
                  { id: 'gap-fill', label: 'Gap Fill' },
                  { id: 'true-false', label: 'True / False' },
                  { id: 'mixed', label: 'Mixed' }
                ].map(format => (
                  <button
                    key={format.id}
                    onClick={() => setActivityConfig({ ...activityConfig, questionFormat: format.id })}
                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activityConfig.questionFormat === format.id
                        ? 'bg-coral text-white shadow-lg shadow-coral/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingDraftType) {
                    handleGenerateDraft(pendingDraftType);
                    setPendingDraftType(null);
                  } else {
                    sendDraftToWorkbench();
                  }
                  setShowConfigModal(false);
                }}
                className="flex-1 py-3 bg-coral text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#DC2E4A] transition-all shadow-lg shadow-coral/20"
              >
                {pendingDraftType ? 'Generate Activity' : 'Add to Workbench'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
