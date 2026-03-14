import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileText, Play, ChevronDown, Plus, RefreshCw } from 'lucide-react';
import { Activity, ClassTag } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createMagicLink, getClassTags, getMagicLinksForActivity } from '../../services/firestoreService';
import toast from 'react-hot-toast';

interface ShareActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity;
  onManageClasses: () => void;
}

export const ShareActivityModal: React.FC<ShareActivityModalProps> = ({ 
  isOpen, 
  onClose, 
  activity,
  onManageClasses
}) => {
  const { user } = useAuth();
  const NON_INTERACTIVE_TYPES = ['speaking', 'writing'];
  const isNonInteractive = NON_INTERACTIVE_TYPES.includes((activity?.activityType || activity?.type || '').toLowerCase());
  const [activeTab, setActiveTab] = useState<'print' | 'interactive'>(isNonInteractive ? 'print' : 'interactive');
  const [collectName, setCollectName] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeKey, setIncludeKey] = useState(true); // default ON — teachers expect the key when printing
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassTag[]>([]);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadClasses();
      checkExistingLink();
    }
  }, [isOpen, user, activity?.id]);

  const loadClasses = async () => {
    if (!user) return;
    const data = await getClassTags(user.uid);
    setClasses(data);
  };

  const checkExistingLink = async () => {
    if (!activity?.id) return;
    try {
      const links = await getMagicLinksForActivity(activity.id);
      if (links && links.length > 0) {
        const link = links[0] as any;
        setMagicLinkUrl(`https://braidstudio.netlify.app/#/test/${link.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLink = async () => {
    if (!user || !activity) return;
    setIsCreating(true);
    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      const link = await createMagicLink(user.uid, activity.id, {
        mode: 'test',
        collectName,
        showAnswers: showResults,
        classTagId: selectedClassId,
        classTagName: selectedClass?.name || null,
        includeNotes,
        includeKey
      });
      setMagicLinkUrl(`https://braidstudio.netlify.app/#/test/${link.id}`);
      toast.success('Magic link created!');
    } catch (err) {
      toast.error('Failed to create link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = () => {
    if (magicLinkUrl) {
      navigator.clipboard.writeText(magicLinkUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const questionCount = activity.interactiveData?.questions?.length || 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-black text-gray-900 uppercase tracking-tight">{activity.title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-6 border-b border-gray-100">
          <div className="flex bg-gray-100 rounded-2xl p-1">
            <button onClick={() => setActiveTab('print')} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 ${activeTab === 'print' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
              <FileText size={16} /> Export / Print
            </button>
            <button
              onClick={() => !isNonInteractive && setActiveTab('interactive')}
              className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
                isNonInteractive
                  ? 'text-gray-300 cursor-not-allowed'
                  : activeTab === 'interactive' ? 'bg-coral text-white' : 'text-gray-500'
              }`}
              title={isNonInteractive ? 'Speaking & Writing activities use print/digital worksheet only' : undefined}
            >
              <Play size={16} /> Interactive Test
            </button>
          </div>
        </div>

        {isNonInteractive && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-start gap-3">
            <span className="text-blue-500 text-lg mt-0.5">💬</span>
            <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase tracking-wide">
              Speaking & Writing activities are productive skills — they can be printed or shared as a digital worksheet. Interactive scoring is not applicable.
            </p>
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${collectName ? 'bg-coral border-coral' : 'border-gray-300'}`}>
                {collectName && <Check size={12} className="text-white" />}
              </div>
              <input type="checkbox" className="hidden" checked={collectName} onChange={e => setCollectName(e.target.checked)} />
              <span className="text-[10px] font-black uppercase text-gray-600">Collect Student Name</span>
            </label>
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${showResults ? 'bg-coral border-coral' : 'border-gray-300'}`}>
                {showResults && <Check size={12} className="text-white" />}
              </div>
              <input type="checkbox" className="hidden" checked={showResults} onChange={e => setShowResults(e.target.checked)} />
              <span className="text-[10px] font-black uppercase text-gray-600">Show Results Instantly</span>
            </label>
            <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${includeNotes ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                {includeNotes && <Check size={12} className="text-white" />}
              </div>
              <input type="checkbox" className="hidden" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} />
              <span className="text-[10px] font-black uppercase text-gray-600">Include Teacher Notes</span>
            </label>
            <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${includeKey ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                {includeKey && <Check size={12} className="text-white" />}
              </div>
              <input type="checkbox" className="hidden" checked={includeKey} onChange={e => setIncludeKey(e.target.checked)} />
              <span className="text-[10px] font-black uppercase text-gray-600">Include Answer Key</span>
            </label>
          </div>

          {activeTab === 'interactive' && (
            <>
              <div className="relative">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Assign to Class</p>
                <button onClick={() => setShowClassDropdown(!showClassDropdown)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">{selectedClass ? selectedClass.name : 'Select a class...'}</span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                {showClassDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-xl z-10">
                    <button onClick={() => { setSelectedClassId(null); setShowClassDropdown(false); }} className="w-full p-3 text-left text-sm font-bold hover:bg-gray-50">No class</button>
                    {classes.map(cls => (
                      <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); setShowClassDropdown(false); }} className="w-full p-3 text-left text-sm font-bold hover:bg-gray-50">{cls.name}</button>
                    ))}
                    <button onClick={() => { setShowClassDropdown(false); onManageClasses(); }} className="w-full p-3 text-left text-sm font-black text-coral hover:bg-coral/5 border-t flex items-center gap-2">
                      <Plus size={14} /> Create New Class
                    </button>
                  </div>
                )}
              </div>

              {magicLinkUrl ? (
                <div className="p-4 bg-gray-900 rounded-xl">
                  <p className="text-[9px] font-black text-gray-500 uppercase mb-2">Magic Link</p>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={magicLinkUrl} className="flex-1 bg-gray-800 text-white text-xs p-3 rounded-lg" />
                    <button onClick={handleCopy} className={`p-3 rounded-lg ${copied ? 'bg-green-500' : 'bg-coral'} text-white`}>
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">{questionCount > 0 ? `✓ ${questionCount} questions ready` : '⚠ No interactive questions'}</p>
                </div>
              ) : (
                <button onClick={handleCreateLink} disabled={isCreating} className="w-full py-4 bg-coral text-white rounded-xl font-black text-[11px] uppercase flex items-center justify-center gap-2">
                  {isCreating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                  {isCreating ? 'Creating...' : 'Generate Magic Link'}
                </button>
              )}
            </>
          )}

          {activeTab === 'print' && (
            <button 
              onClick={() => {
                const win = window.open('', '', 'width=800,height=900');
                if (win) {
                  win.document.write(`
                    <html>
                    <head>
                      <title>${activity.title}</title>
                      <style>
                        body { font-family: system-ui, sans-serif; padding: 40px; color: #111; }
                        h1 { font-size: 24px; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
                        .content { font-size: 14px; line-height: 1.8; }
                        .notes { background: #EFF6FF; border: 1px solid #BFDBFE; padding: 20px; border-radius: 12px; margin-bottom: 24px; }
                        .notes-title { font-size: 11px; font-weight: bold; color: #3B82F6; text-transform: uppercase; margin-bottom: 8px; }
                        .answer-key { margin-top: 40px; padding-top: 24px; border-top: 2px dashed #ccc; }
                        .answer-key-title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 16px; }
                      </style>
                    </head>
                    <body>
                      ${includeNotes && activity.teacherNotes ? `
                        <div class="notes">
                          <div class="notes-title">Teacher Notes</div>
                          <div>${activity.teacherNotes}</div>
                        </div>
                      ` : ''}
                      <h1>${(activity.title || '').replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1').replace(/__(.+?)__/g,'$1').replace(/_(.+?)_/g,'$1').replace(/^#+\s*/gm,'').trim()}</h1>
                      <div class="content">${activity.studentContent || ''}</div>
                      ${includeKey && activity.answerKey ? `
                        <div class="answer-key">
                          <div class="answer-key-title">Answer Key</div>
                          <div>${activity.answerKey}</div>
                        </div>
                      ` : ''}
                    </body>
                    </html>
                  `);
                  win.document.close();
                  setTimeout(() => { win.print(); win.close(); }, 500);
                }
              }} 
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-[11px] uppercase flex items-center justify-center gap-2"
            >
              <FileText size={16} /> Export / Print
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
