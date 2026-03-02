
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStudio } from '../../context/StudioContext';
import { AlertCircle } from 'lucide-react';

interface MaterialTaggingModalProps {
  onClose: (data?: any) => void;
  onSkip: () => void;
  isOpen: boolean;
}

const PUBLISHERS = {
  regional: [
    { id: 'express', name: 'Express Publishing', region: 'europe' },
    { id: 'mm', name: 'MM Publications', region: 'europe' },
    { id: 'burlington', name: 'Burlington Books', region: 'europe' },
    { id: 'hillside', name: 'Hillside Press', region: 'europe' },
  ],
  global: [
    { id: 'cambridge', name: 'Cambridge University Press', region: 'global' },
    { id: 'oxford', name: 'Oxford University Press', region: 'global' },
    { id: 'pearson', name: 'Pearson', region: 'global' },
    { id: 'macmillan', name: 'Macmillan Education', region: 'global' },
    { id: 'natgeo', name: 'National Geographic Learning', region: 'global' },
  ],
  mergeMap: {
    'cambridge': 'Cambridge University Press',
    'oup': 'Oxford University Press',
    'oxford': 'Oxford University Press',
    'cup': 'Cambridge University Press'
  } as Record<string, string>
};

export const MaterialTaggingModal: React.FC<MaterialTaggingModalProps> = ({ onClose, onSkip, isOpen }) => {
  const { user } = useAuth();
  const { uploadNewPage } = useStudio();
  
  const [publisher, setPublisher] = useState('');
  const [publisherOther, setPublisherOther] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [unitPage, setUnitPage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Confirm Dialog State as requested
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (publisherOther) {
      const timer = setTimeout(() => {
        const lower = publisherOther.toLowerCase().trim();
        if (PUBLISHERS.mergeMap[lower]) {
          setSuggestion(PUBLISHERS.mergeMap[lower]);
        } else {
          const allCurated = [...PUBLISHERS.regional, ...PUBLISHERS.global];
          const match = allCurated.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()));
          if (match && match.name.toLowerCase() !== lower) {
            setSuggestion(match.name);
          } else {
            setSuggestion(null);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSuggestion(null);
    }
  }, [publisherOther]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!publisher) newErrors.publisher = 'Please select a publisher';
    if (publisher === 'Other' && !publisherOther.trim()) newErrors.publisher = 'Please enter publisher name';
    if (!bookTitle.trim()) newErrors.bookTitle = 'Please enter a book title';
    else if (bookTitle.trim().length < 2) newErrors.bookTitle = 'Book title too short';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const finalPublisher = publisher === 'Other' ? 'Other' : publisher;
    onClose({
      publisher: finalPublisher,
      publisherOther: publisher === 'Other' ? publisherOther : null,
      publisherVerified: publisher !== 'Other',
      bookTitle: bookTitle.trim(),
      unitPage: unitPage.trim() || null,
      isTagged: true,
      extractedMetadata: null,
      activityCount: 0
    });
  };

  const handleAttemptSkip = () => {
    if (publisher || bookTitle) {
      setConfirmDialog({
        isOpen: true,
        title: 'Discard Tags?',
        message: 'You have entered some information. Are you sure you want to discard it and skip tagging?',
        onConfirm: onSkip
      });
    } else {
      onSkip();
    }
  };

  const filteredPublishers = {
    regional: PUBLISHERS.regional.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    global: PUBLISHERS.global.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Reusable Confirm Dialog JSX */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 text-center">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-gray-900">{confirmDialog.title}</h3>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-8">{confirmDialog.message}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full py-4 bg-coral text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-coral/20 hover:bg-[#DC2E4A]"
                onClick={confirmDialog.onConfirm}
              >
                Discard & Skip
              </button>
              <button
                type="button"
                className="w-full py-4 text-gray-400 font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 rounded-xl"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleAttemptSkip}></div>

      {/* Container */}
      <div 
        ref={modalRef}
        className={`
          relative bg-white shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-8
          ${isMobile 
            ? 'fixed bottom-0 left-0 right-0 rounded-t-[24px] max-h-[85vh]' 
            : 'w-full max-w-[480px] rounded-[20px] p-8'}
        `}
      >
        {isMobile && <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1"></div>}

        {/* Header */}
        <div className={`flex flex-col gap-1 ${isMobile ? 'p-6 pb-2' : 'mb-8'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <h3 className="text-xl font-bold text-black">Let's organize this</h3>
            </div>
            {!isMobile && (
              <button onClick={handleAttemptSkip} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-medium-gray hover:text-dark-gray">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <p className="text-sm text-medium-gray">This helps you find it later and improves suggestions</p>
        </div>

        {/* Form Body */}
        <div className={`space-y-6 ${isMobile ? 'px-6 pb-6 overflow-y-auto max-h-[calc(85vh-200px)]' : ''}`}>
          <div className="space-y-2 relative">
            <div className="flex items-center gap-1">
              <label className="text-[12px] font-bold text-medium-gray uppercase tracking-[0.1em]">PUBLISHER</label>
              <span className="text-coral">*</span>
            </div>
            <div className="relative" ref={dropdownRef}>
              <input 
                type="text"
                placeholder="Search or select publisher..."
                className={`w-full border p-4 rounded-lg text-[15px] bg-white focus:ring-2 focus:ring-coral/10 outline-none transition-all ${errors.publisher ? 'border-red-500' : 'border-slate-200 focus:border-coral'}`}
                value={publisher === 'Other' ? 'Other' : (publisher || searchTerm)}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (publisher !== 'Other') setPublisher('');
                }}
              />
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-[60] max-h-[240px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  {filteredPublishers.regional.length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold text-medium-gray uppercase">Your Region</div>
                      {filteredPublishers.regional.map(p => (
                        <button key={p.id} className="w-full text-left px-4 py-3 text-[14px] hover:bg-gray-50 transition-colors flex items-center justify-between" onClick={() => { setPublisher(p.name); setSearchTerm(''); setIsDropdownOpen(false); setErrors(prev => ({ ...prev, publisher: '' })); }}>{p.name}</button>
                      ))}
                    </>
                  )}
                  <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold text-medium-gray uppercase border-t border-gray-100">All Publishers</div>
                  {filteredPublishers.global.map(p => (
                    <button key={p.id} className="w-full text-left px-4 py-3 text-[14px] hover:bg-gray-50 transition-colors flex items-center justify-between" onClick={() => { setPublisher(p.name); setSearchTerm(''); setIsDropdownOpen(false); setErrors(prev => ({ ...prev, publisher: '' })); }}>{p.name}</button>
                  ))}
                  <button className="w-full text-left px-4 py-4 text-[14px] hover:bg-gray-50 transition-colors border-t border-gray-100 font-bold text-coral flex items-center gap-2" onClick={() => { setPublisher('Other'); setIsDropdownOpen(false); setErrors(prev => ({ ...prev, publisher: '' })); }}>Other</button>
                </div>
              )}
            </div>
            {publisher === 'Other' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <input type="text" autoFocus placeholder="Enter publisher name..." className={`w-full border p-4 bg-white rounded-lg text-[15px] outline-none transition-all ${errors.publisher ? 'border-red-500' : 'border-slate-200 focus:border-coral'}`} value={publisherOther} onChange={(e) => setPublisherOther(e.target.value)} />
                {suggestion && (
                  <div className="mt-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 animate-in slide-in-from-top-1">
                    <button className="w-full bg-white border border-[#BFDBFE] py-2 px-3 rounded text-[14px] font-bold text-dark-gray hover:bg-gray-50 transition-colors text-left" onClick={() => { setPublisher(suggestion); setPublisherOther(''); setSuggestion(null); }}>{suggestion}</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1"><label className="text-[12px] font-bold text-medium-gray uppercase tracking-[0.1em]">BOOK TITLE</label><span className="text-coral">*</span></div>
            <input type="text" placeholder="e.g., English File, Headway..." className={`w-full border p-4 bg-white rounded-lg text-[15px] outline-none transition-all ${errors.bookTitle ? 'border-red-500' : 'border-slate-200 focus:border-coral'}`} value={bookTitle} onChange={(e) => { setBookTitle(e.target.value); if (errors.bookTitle) setErrors(prev => ({ ...prev, bookTitle: '' })); }} />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-medium-gray uppercase tracking-[0.1em]">UNIT / PAGE</label>
            <input type="text" placeholder="e.g., Unit 3, Page 47" className="w-full border border-slate-200 bg-white p-4 rounded-lg text-[15px] outline-none focus:border-coral transition-all" value={unitPage} onChange={(e) => setUnitPage(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-8 flex gap-3 ${isMobile ? 'flex-col-reverse p-6 pt-2 border-t border-gray-100' : 'justify-between items-center'}`}>
          <button onClick={handleAttemptSkip} className={`px-6 py-4 rounded-lg font-bold text-medium-gray hover:bg-gray-100 transition-colors ${isMobile ? 'w-full' : ''}`}>Skip for now</button>
          <button onClick={handleSave} className={`bg-coral text-white font-bold py-4 px-8 rounded-lg shadow-lg shadow-coral/20 transition-all ${(!publisher || !bookTitle) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#DC2E4A]'}`}>Save & Continue →</button>
        </div>
      </div>
    </div>
  );
};
