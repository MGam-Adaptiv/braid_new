import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { Shuffle, Check, Plus, ArrowUp, RefreshCw } from 'lucide-react';
import { marked } from 'marked';

// ── Activity type chips (6 most common) ──────────────────────────────────────
const ACTIVITY_CHIPS = [
  { id: 'gap_fill',                label: 'Gap Fill'          },
  { id: 'error_correction',        label: 'Error Correction'  },
  { id: 'multiple_choice_grammar', label: 'Multiple Choice'   },
  { id: 'true_false_ng',           label: 'True / False'      },
  { id: 'matching',                label: 'Matching'          },
  { id: 'speaking_cards',          label: 'Speaking Cards'    },
];

const DIFFICULTY_CHIPS = [
  { id: 'easier',   label: 'Easier'   },
  { id: 'at_level', label: 'At Level' },
  { id: 'harder',   label: 'Harder'   },
];

// ── Component ────────────────────────────────────────────────────────────────

export const PartnerPanel: React.FC = () => {
  const {
    partnerInput, setPartnerInput,
    handleGenerateDraft, isGenerating,
    draftContent,
    sendDraftToWorkbench, currentDraftId,
    sources, isRefining, handleRefineDraft,
    setSelectedActivityTypeId,
    grammarFocus,
    combinedExtraction,
    wordBankEnabled,
  } = useStudio();

  const [selectedTypeId, setSelectedTypeId] = useState<string>('gap_fill');
  const [difficulty, setDifficulty]         = useState<string>('at_level');
  const [isExpanded, setIsExpanded]         = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasMaterial = sources.length > 0;

  // Sync default type to context on mount
  useEffect(() => {
    setSelectedActivityTypeId('gap_fill');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when draft appears
  useEffect(() => {
    if (draftContent && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [draftContent]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTypeChipClick = (id: string) => {
    setSelectedTypeId(id);
    setSelectedActivityTypeId(id);
  };

  const handleSend = () => {
    if (!hasMaterial || isGenerating || isRefining) return;

    if (draftContent && partnerInput.trim()) {
      handleRefineDraft(partnerInput);
      return;
    }

    // Compose instruction from selected type + optional difficulty modifier
    const chip = ACTIVITY_CHIPS.find(c => c.id === selectedTypeId);
    const baseType = chip?.label || 'mixed';
    const difficultyNote =
      difficulty === 'easier' ? ' — simpler vocabulary and shorter sentences, make it more accessible'
      : difficulty === 'harder' ? ' — more complex structures and advanced vocabulary, make it challenging'
      : '';

    const instruction = partnerInput.trim()
      ? partnerInput.trim()
      : `${baseType}${difficultyNote}`;

    handleGenerateDraft(instruction);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const contextPills = [
    ...(grammarFocus              ? [grammarFocus]                           : []),
    ...(combinedExtraction?.level ? [combinedExtraction.level]              : []),
    ...(combinedExtraction?.topic ? [combinedExtraction.topic.slice(0, 35)] : []),
  ].filter(Boolean);

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
          <div className="flex items-center gap-2">
            <Shuffle size={18} strokeWidth={2} className="text-coral" />
            <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
              Draft Partner
            </h2>
          </div>
          <div className={`w-1.5 h-1.5 rounded-full ${
            hasMaterial
              ? isGenerating || isRefining ? 'bg-coral animate-pulse' : 'bg-green-400'
              : 'bg-gray-300'
          }`} />
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

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <div className="px-4 pb-5 pt-3 border-t border-gray-100 shrink-0 bg-white space-y-3">

        {hasMaterial && (
          <>
            {/* Activity type chips */}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 mb-1.5">Activity Type</p>
              <div className="flex flex-wrap gap-1.5">
                {ACTIVITY_CHIPS.map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => handleTypeChipClick(chip.id)}
                    disabled={isGenerating || isRefining}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border disabled:opacity-40 disabled:cursor-not-allowed ${
                      selectedTypeId === chip.id
                        ? 'bg-coral text-white border-coral shadow-sm'
                        : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty chips */}
            <div className="flex items-center gap-2">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 shrink-0">Difficulty</p>
              <div className="flex gap-1.5">
                {DIFFICULTY_CHIPS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    disabled={isGenerating || isRefining}
                    className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all border disabled:opacity-40 disabled:cursor-not-allowed ${
                      difficulty === d.id
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Text input + send */}
        <div className="flex gap-2">
          <input
            type="text"
            value={partnerInput}
            disabled={!hasMaterial || isGenerating || isRefining}
            onChange={e => setPartnerInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={draftContent ? 'Refine: "make it harder"…' : 'Custom instruction (optional)…'}
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-medium text-gray-600 placeholder-gray-300 outline-none focus:border-coral focus:bg-white transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isGenerating || isRefining || !hasMaterial}
            className="w-12 h-12 bg-coral text-white rounded-2xl flex items-center justify-center shadow-lg shadow-coral/20 hover:bg-[#DC2E4A] transition-all disabled:opacity-30 active:scale-95"
          >
            {isGenerating || isRefining
              ? <RefreshCw size={20} className="animate-spin" />
              : <ArrowUp size={20} strokeWidth={3} />}
          </button>
        </div>
      </div>
    </div>
  );
};

