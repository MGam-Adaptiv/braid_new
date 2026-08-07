import React, { useState } from 'react';
import { ACTIVITY_TYPES, WORD_BANK_TYPES } from '../constants/activityTypes';
import { ChevronDown, Check } from 'lucide-react';

interface ActivityTypePickerProps {
  selected: string | null;
  onSelect: (id: string) => void;
  wordBankEnabled: boolean;
  onToggleWordBank: () => void;
  grammarFocus: string;
  onChangeGrammarFocus: (v: string) => void;
  allGrammarPoints: string[];
  selectedSkills: string[];
}

type FormatFilter = 'all' | 'print' | 'online' | 'both';

const formatBadge: Record<string, string> = {
  print: 'bg-amber-100 text-amber-700',
  online: 'bg-blue-100 text-blue-700',
  both: 'bg-green-100 text-green-700',
};

const categoryBadge: Record<string, string> = {
  grammar: 'bg-coral/10 text-coral',
  vocabulary: 'bg-teal-100 text-teal-700',
  mixed: 'bg-gray-100 text-gray-600',
};

export const ActivityTypePicker: React.FC<ActivityTypePickerProps> = ({
  selected,
  onSelect,
  wordBankEnabled,
  onToggleWordBank,
  grammarFocus,
  onChangeGrammarFocus,
  allGrammarPoints,
  selectedSkills,
}) => {
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [showGrammarDropdown, setShowGrammarDropdown] = useState(false);

  const filtered = ACTIVITY_TYPES.filter((t) => {
    const skillOk = selectedSkills.length === 0 || t.skills.some(s => selectedSkills.includes(s));
    const fmtOk = formatFilter === 'all' || t.format === formatFilter;
    return skillOk && fmtOk;
  });

  const selectedType = ACTIVITY_TYPES.find((t) => t.id === selected);
  const showWordBank = selected ? WORD_BANK_TYPES.includes(selected) : false;

  return (
    <div className="space-y-3">
      {/* Grammar Focus Chip */}
      {grammarFocus && (
        <div className="relative">
          <button
            onClick={() => setShowGrammarDropdown(!showGrammarDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-coral/5 border border-coral/20 rounded-xl text-[10px] font-black text-coral uppercase tracking-widest hover:bg-coral/10 transition-colors"
          >
            <span>Grammar focus: {grammarFocus}</span>
            <ChevronDown size={12} className={`transition-transform ${showGrammarDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showGrammarDropdown && allGrammarPoints.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
              {allGrammarPoints.map((point) => (
                <button
                  key={point}
                  onClick={() => {
                    onChangeGrammarFocus(point);
                    setShowGrammarDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-gray-50 transition-colors ${
                    point === grammarFocus ? 'text-coral bg-coral/5' : 'text-gray-600'
                  }`}
                >
                  {point}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Format Filter */}
      <div className="flex gap-1">
        {(['all', 'print', 'online', 'both'] as FormatFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFormatFilter(f)}
            className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${
              formatFilter === f
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Activity Type Grid */}
      <div className="grid grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto pr-0.5 no-scrollbar">
        {filtered.map((type) => {
          const isSelected = type.id === selected;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={`text-left p-2.5 rounded-xl border transition-all ${
                isSelected
                  ? 'border-coral bg-coral/5 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className={`text-[9px] font-black leading-tight ${isSelected ? 'text-coral' : 'text-gray-900'}`}>
                  {type.name}
                </span>
                {isSelected && (
                  <div className="w-3.5 h-3.5 rounded-full bg-coral flex items-center justify-center shrink-0 ml-1">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <p className="text-[8px] text-gray-400 font-medium leading-tight mb-1.5">{type.uiLabel}</p>
              <div className="flex gap-1 flex-wrap">
                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${categoryBadge[type.category]}`}>
                  {type.category}
                </span>
                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${formatBadge[type.format]}`}>
                  {type.format}
                </span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 py-6 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            No types match filters
          </div>
        )}
      </div>

      {/* Word Bank Toggle — only for applicable types */}
      {showWordBank && (
        <button
          onClick={onToggleWordBank}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
            wordBankEnabled
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}
        >
          <span className="text-[9px] font-black uppercase tracking-widest">Include Word Bank</span>
          <div className={`w-8 h-4 rounded-full transition-colors relative ${wordBankEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${wordBankEnabled ? 'left-4' : 'left-0.5'}`} />
          </div>
        </button>
      )}
    </div>
  );
};
