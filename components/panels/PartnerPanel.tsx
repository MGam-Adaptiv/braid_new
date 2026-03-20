import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import {
  Shuffle, PencilRuler, Check, Plus,
  ArrowRight, ArrowUp, RefreshCw, X
} from 'lucide-react';
import { marked } from 'marked';
import { ActivityTypePicker } from '../ActivityTypePicker';
import { ACTIVITY_TYPES, WORD_BANK_TYPES } from '../../constants/activityTypes';

export const PartnerPanel: React.FC = () => {
  const {
    partnerInput,
    setPartnerInput,
    handleGenerateDraft,
    isGenerating,
    draftContent,
    sendDraftToWorkbench,
    currentDraftId,
    sources,
    isRefining,
    handleRefineDraft,
    selectedActivityTypeId,
    setSelectedActivityTypeId,
    grammarFocus,
    setGrammarFocus,
    wordBankEnabled,
    setWordBankEnabled,
    combinedExtraction,
  } = useStudio();

  const [isExpanded, setIsExpanded]         = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [partnerStage, setPartnerStage]     = useState<'braid' | 'create'>('braid');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasMaterial = sources.length > 0;

  // Auto-advance to Create when a draft is generated
  useEffect(() => {
    if (draftContent) setPartnerStage('create');
  }, [draftContent]);

  useEffect(() => {
    if (draftContent && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [draftContent]);

  const toggleSkill = (skill: string) =>
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );

  const skillChips = ['Reading', 'Grammar', 'Vocabulary', 'Speaking', 'Writing'];

  // Summary chips shown on the Braid row when Create stage is active
  const selectedType = ACTIVITY_TYPES.find(t => t.id === selectedActivityTypeId);
  const braidSummaryChips = [
    ...selectedSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    ...(selectedType ? [selectedType.name] : []),
    ...(wordBankEnabled && selectedActivityTypeId && WORD_BANK_TYPES.includes(selectedActivityTypeId)
      ? ['Word bank'] : []),
  ].filter(Boolean);

  // --- PREVIEW CLEANER ---
  const renderCleanPreview = (rawText: string) => {
    const textOnly = rawText.split('---INTERACTIVE DATA---')[0];
    const cleanText = textOnly
      .replace(/---TYPE:/g, '\n\n**TYPE:**')
      .replace(/---TEACHER NOTES---/g, '\n\n**TEACHER NOTES**\n')
      .replace(/---STUDENT CONTENT---/g, '\n\n**STUDENT CONTENT**\n')
      .replace(/---ANSWER KEY---/g, '\n\n**ANSWER KEY**\n')
      .replace(/---TITLE---/g, '\n# ');
    return { __html: marked.parse(cleanText) };
  };

  // ── Stage selector rows ──────────────────────────────────────────────────

  const BraidRow = () => {
    const isActive = partnerStage === 'braid';
    const isDone   = partnerStage === 'create';
    return (
      <div
        onClick={() => isDone ? setPartnerStage('braid') : undefined}
        className={`flex items-start gap-3 px-3.5 py-3 transition-colors ${
          isActive ? 'bg-[#FFF5F4] cursor-default'
          : isDone  ? 'bg-white cursor-pointer hover:bg-gray-50'
          :           'bg-white opacity-50 cursor-not-allowed'
        }`}
      >
        {/* Icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
          isActive ? 'bg-coral shadow-sm shadow-coral/25'
          : isDone  ? 'bg-green-50'
          :           'bg-gray-100'
        }`}>
          <Shuffle
            size={13}
            strokeWidth={2.2}
            className={isActive ? 'text-white' : isDone ? 'text-green-600' : 'text-gray-400'}
          />
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-black leading-tight ${
            isActive ? 'text-gray-900' : isDone ? 'text-gray-600' : 'text-gray-500'
          }`}>
            Braid
          </p>
          {isActive && (
            <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
              Plan your activity — pick skill, type &amp; options before generating.
            </p>
          )}
          {isDone && braidSummaryChips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {braidSummaryChips.map(chip => (
                <span key={chip} className="text-[8px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
                  {chip}
                </span>
              ))}
            </div>
          )}
          {isDone && braidSummaryChips.length === 0 && (
            <p className="text-[9px] text-gray-400 mt-0.5">No options set — tap to edit</p>
          )}
        </div>
        {/* Status */}
        {isActive && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" fill="#F0453A"/>
            <path d="M7.5 12L10.5 15L16.5 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {isDone && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" fill="#16A34A"/>
            <path d="M7.5 12L10.5 15L16.5 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    );
  };

  const CreateRow = () => {
    const isActive = partnerStage === 'create';
    const isLocked = partnerStage === 'braid';
    return (
      <div className={`flex items-start gap-3 px-3.5 py-3 transition-colors ${
        isActive ? 'bg-gray-900 cursor-default' : 'bg-white opacity-50 cursor-not-allowed'
      }`}>
        {/* Icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
          isActive ? 'bg-white/15' : 'bg-gray-100'
        }`}>
          <PencilRuler
            size={13}
            strokeWidth={2.2}
            className={isActive ? 'text-white' : 'text-gray-400'}
          />
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-black leading-tight ${isActive ? 'text-white' : 'text-gray-500'}`}>
            Create
          </p>
          <p className={`text-[10px] leading-relaxed mt-0.5 ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>
            {isActive
              ? 'Type a request or generate with your Braid settings.'
              : 'Generate the activity using your Braid settings.'}
          </p>
        </div>
        {/* Status */}
        {isLocked && (
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1 shrink-0">Step 2</span>
        )}
        {isActive && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" fill="#F0453A"/>
            <path d="M7.5 12L10.5 15L16.5 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">

      {/* HEADER */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle size={18} strokeWidth={2} className="text-coral" />
            <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Draft Partner</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              hasMaterial
                ? isGenerating ? 'bg-coral animate-pulse' : 'bg-green-400'
                : 'bg-gray-300'
            }`} />
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              {hasMaterial ? (isGenerating ? 'Drafting...' : 'Ready') : 'Awaiting Source'}
            </span>
          </div>
        </div>
      </div>

      {/* STAGE SELECTOR */}
      <div className="px-4 pt-4 pb-1 shrink-0">
        <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-sm">
          <BraidRow />
          <CreateRow />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BRAID STAGE
          ══════════════════════════════════════════ */}
      {partnerStage === 'braid' && (
        <>
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-3 space-y-4 no-scrollbar">
            {!hasMaterial ? (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-10">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <Shuffle size={20} className="text-gray-400" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Upload material first</p>
                <p className="text-[10px] text-gray-300 mt-1 max-w-[180px] leading-relaxed">
                  Add a source in the Source tab to begin braiding.
                </p>
              </div>
            ) : (
              <>
                {/* Skill Focus */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Skill Focus</p>
                    <span className="text-[8px] text-gray-300 font-medium">— select one or more</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skillChips.map(skill => {
                      const active = selectedSkills.includes(skill.toLowerCase());
                      return (
                        <button
                          key={skill}
                          onClick={() => toggleSkill(skill.toLowerCase())}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
                            active
                              ? 'bg-coral text-white shadow-sm shadow-coral/20'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detected Tense chip (grammar focus) */}
                {grammarFocus && (
                  <div className="bg-[#FFF5F4] border border-coral/15 rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-black text-coral/60 uppercase tracking-widest mb-0.5">Detected Tense</p>
                      <p className="text-[11px] font-black text-gray-800">{grammarFocus}</p>
                    </div>
                    <button
                      onClick={() => setGrammarFocus('')}
                      className="flex items-center gap-1 text-[9px] text-gray-400 font-semibold hover:text-gray-600 transition-colors"
                    >
                      <span>clear</span>
                      <X size={10} />
                    </button>
                  </div>
                )}

                {/* Activity Type Picker */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Activity Type</p>
                    <span className="text-[8px] text-gray-300 font-medium">— filtered by skill</span>
                  </div>
                  <ActivityTypePicker
                    selected={selectedActivityTypeId}
                    onSelect={setSelectedActivityTypeId}
                    wordBankEnabled={wordBankEnabled}
                    onToggleWordBank={() => setWordBankEnabled(v => !v)}
                    grammarFocus={grammarFocus}
                    onChangeGrammarFocus={setGrammarFocus}
                    allGrammarPoints={combinedExtraction?.grammar || []}
                    selectedSkills={selectedSkills}
                  />
                </div>
              </>
            )}
          </div>

          {/* BRAID FOOTER */}
          <div className="px-4 pb-5 pt-3 border-t border-gray-100 shrink-0 bg-white space-y-2.5">
            <input
              type="text"
              value={partnerInput}
              disabled={!hasMaterial}
              onChange={e => setPartnerInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && hasMaterial) setPartnerStage('create'); }}
              placeholder="Add extra instructions (optional)..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-medium text-gray-600 placeholder-gray-300 outline-none focus:border-coral focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              onClick={() => setPartnerStage('create')}
              disabled={!hasMaterial}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] shadow-md"
            >
              <span>Create Activity</span>
              <ArrowRight size={12} strokeWidth={3} />
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          CREATE STAGE
          ══════════════════════════════════════════ */}
      {partnerStage === 'create' && (
        <>
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3 space-y-3.5 no-scrollbar">

            {/* Empty state — ready to generate */}
            {!isGenerating && !draftContent && hasMaterial && (
              <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center gap-3 py-10">
                <div className="w-10 h-10 bg-white rounded-2xl border border-gray-200 flex items-center justify-center shadow-sm">
                  <PencilRuler size={16} strokeWidth={2} className="text-gray-300" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Ready to generate</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                    {selectedType
                      ? `"${selectedType.name}" will be created from your source material.`
                      : 'Your activity will be created from your source material.'}
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateDraft()}
                  disabled={isGenerating}
                  className="px-5 py-2 bg-coral text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-[#DC2E4A] transition-all shadow-md shadow-coral/20 disabled:opacity-50"
                >
                  Generate Now
                </button>
              </div>
            )}

            {/* Generating animation */}
            {isGenerating && (
              <div className="flex gap-3 animate-in fade-in">
                <div className="w-8 h-8 bg-coral rounded-xl flex items-center justify-center mt-1 shadow-md shadow-coral/10">
                  <Shuffle size={14} strokeWidth={2} className="text-white animate-spin" />
                </div>
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-coral/40 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-coral/60 rounded-full animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 bg-coral rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}

            {/* Draft card */}
            {draftContent && (
              <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Draft header */}
                  <div className="bg-coral/5 px-4 py-2 border-b border-coral/10 flex justify-between items-center">
                    <span className="text-[10px] font-black text-coral uppercase tracking-widest flex items-center gap-2">
                      <Check size={12} strokeWidth={4} /> Draft Generated
                    </span>
                  </div>
                  {/* Draft body */}
                  <div className="p-5">
                    <div className={`prose prose-sm max-w-none text-gray-600 transition-all duration-500 ${
                      isExpanded ? '' : 'max-h-[240px] overflow-hidden relative'
                    }`}>
                      <div dangerouslySetInnerHTML={renderCleanPreview(draftContent)} />
                      {!isExpanded && (
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                      )}
                    </div>
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-4 w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors border-t border-gray-50 flex items-center justify-center gap-1"
                    >
                      {isExpanded ? 'Collapse' : 'Show Full Draft'}
                    </button>
                  </div>
                  {/* Draft action footer */}
                  <div className="p-2 bg-gray-50 border-t border-gray-100">
                    {currentDraftId ? (
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5">
                          <Check size={12} strokeWidth={3} /> In Workbench
                        </span>
                        <button
                          onClick={sendDraftToWorkbench}
                          className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={sendDraftToWorkbench}
                        className="w-full py-4 bg-coral text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#DC2E4A] transition-all shadow-lg shadow-coral/20 flex items-center justify-center gap-2 active:scale-[0.99]"
                      >
                        <Plus size={14} strokeWidth={3} /> ADD TO WORKBENCH
                      </button>
                    )}
                  </div>
                </div>
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* CREATE FOOTER */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={partnerInput}
                disabled={!hasMaterial || isGenerating}
                onChange={e => setPartnerInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    draftContent ? handleRefineDraft(partnerInput) : handleGenerateDraft();
                  }
                }}
                placeholder={draftContent ? 'Ask to refine...' : 'Extra instructions (optional)...'}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:border-coral outline-none disabled:opacity-50 transition-all focus:bg-white"
              />
              <button
                onClick={() => draftContent ? handleRefineDraft(partnerInput) : handleGenerateDraft()}
                disabled={isGenerating || isRefining || !hasMaterial}
                className="w-12 h-12 bg-coral text-white rounded-xl flex items-center justify-center shadow-lg shadow-coral/20 hover:bg-[#DC2E4A] transition-all disabled:opacity-30 active:scale-95"
              >
                {(isGenerating || isRefining)
                  ? <RefreshCw size={20} className="animate-spin" />
                  : <ArrowUp size={20} strokeWidth={3} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
