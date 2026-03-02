import React from 'react';
import { FileText, Check } from 'lucide-react';

interface DraftBadgeProps {
  status: 'draft' | 'approved';
}

export const DraftBadge: React.FC<DraftBadgeProps> = ({ status }) => {
  const isDraft = status === 'draft';
  return (
    <span className={`
      px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border
      ${isDraft ? 'bg-coral-light/20 text-coral border-coral/30' : 'bg-gray-100 text-gray-700 border-gray-200'}
    `}>
      {isDraft ? <FileText className="w-3 h-3" /> : <Check className="w-3 h-3 text-coral" />}
      {status}
    </span>
  );
};
