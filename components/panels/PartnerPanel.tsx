import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { Shuffle, Check, Plus, ArrowUp, RefreshCw, Zap, GitBranch } from 'lucide-react';
import { marked } from 'marked';
import { ACTIVITY_TYPES } from '../../constants/activityTypes';

// ── Constants ────────────────────────────────────────────────────────────────

// Create mode: one-tap quick generation chips
const QUICK_TYPES = [
  { id: 'gap_fill',                label: 'Gap Fill'         },
  { id: 'error_correction',        label: 'Error Correction' },
  { id: 'true_false_ng',           label: 'True / False'     },
  { id: 'speaking_cards',          label: 'Speaking Cards'   },
];

// Braid mode: 4-card type selector (most common)
const BRAID_TYPE_IDS = [
  'gap_fill', 'error_correction', 'multiple_choice_grammar', 'speaking_cards',
];
const BRAID_TYPES = ACTIVITY_TYPES.filter(t => BRAID_TYPE_IDS.includes(t.id));

// ── Component ────────────────────────────────────────────────────────────────

export const PartnerPanel: React.FC = () => {
  const {
    partnerInput, setPartnerInput,
    handleGenerateDraft, isGenerating,
    draftContent,
    sendDraftToWorkbench, currentDraftId,
    sources, isRefining, handleRefineDraft,
    selectedActivityTypeId, setSelectedActivityTypeId,
    grammarFocus, setGrammarFocus,
    combinedExtraction,
    wordBankEnabled, setWordBankEnabled,
  } = useStudio();

  const [mode, setMode]                       = useState<'create' | 'braid'>('create');
  const [isExpanded, setIsExpanded]           = useState(false);
  const [selectedGrammar, setSelectedGrammar] = useState<string[]>([]);
  const [selectedTypeId, setSelectedTypeId]   = useState<string>('gap_fill');

  const chatEndRef     = useRef<HTMLDivElement>(null);
  const pendingGenType = useRef<string | null>(null);

  const hasMaterial   = sources.length > 0;
  const grammarPoints = combinedExtraction?.grammar || [];

  // Auto-init grammar chips from source scan
  useEffect(() => {
    if (grammarPoints.length > 0 && selectedGrammar.length === 0) {
      setSelectedGrammar([grammarPoints[0]]);
    }
  }, [combinedExtraction]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync selected type to context when switching to Braid (so it's settled before Create click)
  useEffect(() => {
    if (mode === 'braid') {
      setSelectedActivityTypeId(selectedTypeId);
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire queued generation after selectedActivityTypeId state settles (Create mode chips)
  useEffect(() => {
    if (pendingGenType.current !== null && selectedActivityTypeId !== null) {
      const typeLabel = pendingGenType.current;
      pendingGenType.current = null;
      handleGenerateDraft(typeLabel);
    }
  }, [selectedActivityTypeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when draft appears
  useEffect(() => {
    if (draftContent && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [draftContent]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleGrammar = (point: string) =>
    setSelectedGrammar(prev =>
      prev.includes(point) ? prev.filter(p => p !== point) : [...prev, point]
    );

  // Create mode: tap chip → set type in context → useEffect fires generation
  const quickGenerate = (id: string, label: string) => {
    if (!hasMaterial || isGenerating || isRefining) return;
    pendingGenType.current = label;
    setSelectedActivityTypeId(id);
  };

  // Braid mode: card click → sync local + context (type is settled by time Create is clicked)
  const handleBraidTypeSelect = (id: string) => {
    setSelectedTypeId(id);
    setSelectedActivityTypeId(id);
  };

  // Braid mode: Create Activity button
  const handleBraidCreate = () => {
    if (!hasMaterial || isGenerating || isRefining) return;
    if (selectedGrammar.length > 0) setGrammarFocus(selectedGrammar.join(', '));
    const typeName = BRAID_TYPES.find(t => t.id === selectedTypeId)?.name || 'mixed';
    handleGenerateDraft(typeName);
  };

  // ── Derived values ────────────────────────────────────────────────────────

  // Context pills shown in body
  const contextPills = [
    ...(grammarFocus              ? [grammarFocus]                            : []),
    ...(combinedExtraction?.level ? [combinedExtraction.level]               : []),
    ...(combinedExtraction?.topic ? [combinedExtraction.topic.slice(0, 35)]  : []),
  ].filter(Boolean);

  // Plan Preview sentence (Braid mode)
  const selectedTypeName = BRAID_TYPES.find(t => t.id === selectedTypeId)?.name || 'activity';
  const grammarLabel     = selectedGrammar.join(' + ') || grammarFocus || 'key grammar';
  const topicLabel       = combinedExtraction?.topic || 'your source material';
  const levelLabel       = combinedExtraction?.level ? `${combinedExtraction.level} level. ` : '';
  const wbLabel          = wordBankEnabled ? 'Word bank included.' : '';
  const planPreview      = `I'll create a ${selectedTypeName} targeting ${grammarLabel}, drawing from ${topicLabel}. ${levelLabel}${wbLabel}`.trim();

  // Strip markdown delimiters for the draft preview card
  const renderCleanPreview = (rawText: string) => {
    const textOnly  = rawText.split('---INTERACTIVE DATA---')[0];
    const cleanText = textOnly
      .replace(/---TYPE:/g,              '\n\n**TYPE:**')
      .replace(/---TEACHER NOTES---/g,   '\n\n**TEACHER NOTES**\n')
      .replace(/---STUDENT CONTENT---/g, '\n\n**STUDENT CONTENT**\n')
      .replace(/---ANSWER KEY---/g,      '\n\n**ANSWER KEY**\n')
      .replace(/---TITLE---/g,           '\n# ');
    return { __html: marked.parse(cleanText) };
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">

          {/* Title */}
          <div className="flex items-center gap-2">
            <Shuffle size={18} strokeWidth={2} className="text-coral" />
            <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
              Draft Partner
            </h2>
          </div>

          {/* Mode toggle + status */}
          <div className="flex items-center gap-2.5">
            <div className="flex bg-gray-100 rounded-full p-0.5">
              <button
                onClick={() => setMode('create')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                  mode === 'create'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Zap size={8} strokeWidth={3} />
                Create
              </button>
              <button
                onClick={() => setMode('braid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                  mode === 'braid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <GitBranch size={8} strokeWidth={3} />
                Braid
              </button>
            </div>
            <div className={`w-1.5 h-1.5 rounded-full ${
              hasMaterial
                ? isGenerating || isRefining ? 'bg-coral animate-pulse' : 'bg-green-400'
                : 'bg-gray-300'
            }`} />
          </div>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3 space-y-3 no-scrollbar">

        {/* No material placeholder */}
        {!hasMaterial && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <Shuffle size={20} className="text-gray-400" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Upload material first
            </p>
            <p className="text-[10px] text-gray-300 mt-1 max-w-[180px] leading-relaxed">
              Add a source in the Source tab to begin drafting.
            </p>
          </div>
        )}

        {/* Auto-detected context pills */}
        {hasMaterial && contextPills.length > 0 && !draftContent && !isGenerating && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {contextPills.map(pill => (
              <span key={pill} className="text-[9px] font-bold bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full">
                {pill}
              </span>
            ))}
          </div>
        )}

        {/* Generating pulse */}
        {(isGenerating || isRefining) && (
          <div className="flex gap-3 animate-in fade-in">
            <div className="w-8 h-8 bg-coral rounded-xl flex items-center justify-center mt-1 shadow-md shadow-coral/10 shrink-0">
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

              <div className="bg-coral/5 px-4 py-2 border-b border-coral/10 flex items-center">
                <span className="text-[10px] font-black text-coral uppercase tracking-widest flex items-center gap-2">
                  <Check size={12} strokeWidth={4} /> Draft Generated
                </span>
              </div>

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
                  onClick={() => setIsExpanded(v => !v)}
                  className="mt-4 w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors border-t border-gray-100 flex items-center justify-center gap-1"
                >
                  {isExpanded ? 'Collapse' : 'Show Full Draft'}
                </button>
              </div>

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

      {/* ── FOOTER — CREATE MODE ─────────────────────────────────────────── */}
      {mode === 'create' && (
        <div className="px-4 pb-5 pt-3 border-t border-gray-100 shrink-0 bg-white space-y-2.5">

          {/* Quick chips */}
          {hasMaterial && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TYPES.map(qt => (
                <button
                  key={qt.id}
                  onClick={() => quickGenerate(qt.id, qt.label)}
                  disabled={isGenerating || isRefining}
                  className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 hover:bg-coral hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {qt.label}
                </button>
              ))}
            </div>
          )}

          {/* Text input + send */}
          <div className="flex gap-2">
            <input
              type="text"
              value={partnerInput}
              disabled={!hasMaterial || isGenerating || isRefining}
              onChange={e => setPartnerInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && partnerInput.trim()) {
                  draftContent
                    ? handleRefineDraft(partnerInput)
                    : handleGenerateDraft(partnerInput);
                }
              }}
              placeholder={draftContent ? 'Refine: "make it harder"…' : 'Describe what you want…'}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-medium text-gray-600 placeholder-gray-300 outline-none focus:border-coral focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              onClick={() => {
                draftContent
                  ? handleRefineDraft(partnerInput)
                  : handleGenerateDraft(partnerInput.trim() || 'mixed');
              }}
              disabled={isGenerating || isRefining || !hasMaterial}
              className="w-12 h-12 bg-coral text-white rounded-2xl flex items-center justify-center shadow-lg shadow-coral/20 hover:bg-[#DC2E4A] transition-all disabled:opacity-30 active:scale-95"
            >
              {isGenerating || isRefining
                ? <RefreshCw size={20} className="animate-spin" />
                : <ArrowUp size={20} strokeWidth={3} />}
            </button>
          </div>
        </div>
      )}

      {/* ── FOOTER — BRAID MODE ──────────────────────────────────────────── */}
      {mode === 'braid' && (
        <div className="border-t border-gray-100 shrink-0 bg-white flex flex-col">

          {/* Scrollable config area */}
          <div className="overflow-y-auto max-h-[400px] no-scrollbar px-4 pt-4 pb-2 space-y-4">

            {/* Grammar Focus */}
            {grammarPoints.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Grammar Focus
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {grammarPoints.map(point => (
                    <button
                      key={point}
                      onClick={() => toggleGrammar(point)}
                      className={`px-2.5 py-1.5 rounded-full text-[9px] font-black tracking-wide transition-all border ${
                        selectedGrammar.includes(point)
                          ? 'bg-coral/10 text-coral border-coral/30 shadow-sm'
                          : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {point}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Type */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                Activity Type
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {BRAID_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleBraidTypeSelect(type.id)}
                    className={`px-3 py-2.5 rounded-xl text-left transition-all border ${
                      selectedTypeId === type.id
                        ? 'bg-coral/5 border-coral/40 text-coral'
                        : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-[10px] font-black leading-none">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Word Bank */}
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Word Bank</p>
              <button
                onClick={() => setWordBankEnabled(v => !v)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black transition-all border ${
                  wordBankEnabled
                    ? 'bg-coral/10 text-coral border-coral/30'
                    : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                }`}
              >
                {wordBankEnabled ? '☑ Include' : '☐ Exclude'}
              </button>
            </div>

            {/* Plan Preview */}
            {hasMaterial && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  Plan Preview
                </p>
                <p className="text-[11px] text-gray-600 leading-relaxed italic">{planPreview}</p>
              </div>
            )}
          </div>

          {/* Create Activity button (fixed at bottom of braid footer) */}
          <div className="px-4 pb-5 pt-2 shrink-0">
            <button
              onClick={handleBraidCreate}
              disabled={isGenerating || isRefining || !hasMaterial}
              className="w-full py-4 bg-coral text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-[#DC2E4A] transition-all shadow-lg shadow-coral/20 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-40"
            >
              {isGenerating || isRefining
                ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                : <><GitBranch size={14} strokeWidth={2.5} /> Create Activity</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

