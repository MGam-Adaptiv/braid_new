import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileText, Play, ChevronDown, Plus, RefreshCw, Link, Trash2, AlertCircle } from 'lucide-react';
import { Activity, ClassTag } from '../../types';
import { ACTIVITY_TYPES } from '../../constants/activityTypes';
import { useAuth } from '../../context/AuthContext';
import { createMagicLink, getClassTags, getMagicLinksForActivity, updateActivity, revokeMagicLink } from '../../services/firestoreService';
import { convertToInteractive } from '../../services/mistralService';
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
  const NON_INTERACTIVE_KEYWORDS = ['speaking', 'writing', 'discussion'];
  const activityTypeStr = (activity?.activityType || (activity as any)?.activityTypeName || activity?.type || '').toLowerCase();
  const isNonInteractive = NON_INTERACTIVE_KEYWORDS.some(k => activityTypeStr.includes(k));
  const matchedType = ACTIVITY_TYPES.find(t =>
    t.id === (activity as any)?.activityType ||
    t.name === (activity as any)?.activityType ||
    t.id === (activity as any)?.activityTypeName ||
    t.name === (activity as any)?.activityTypeName
  );
  const isPrintOnly = matchedType?.format === 'print' || isNonInteractive || (activity as any)?.activityFormat === 'print';

  const [activeTab, setActiveTab]           = useState<'print' | 'interactive' | 'manage'>(isPrintOnly ? 'print' : 'interactive');
  const [collectName, setCollectName]       = useState(true);
  const [showResults, setShowResults]       = useState(true);
  const [includeNotes, setIncludeNotes]     = useState(false);
  const [includeKey, setIncludeKey]         = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classes, setClasses]               = useState<ClassTag[]>([]);
  const [magicLinkUrl, setMagicLinkUrl]     = useState<string | null>(null);
  const [isCreating, setIsCreating]         = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [allLinks, setAllLinks]             = useState<any[]>([]);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [copiedLinkId, setCopiedLinkId]     = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadClasses();
      loadAllLinks();
    }
  }, [isOpen, user, activity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClasses = async () => {
    if (!user) return;
    const data = await getClassTags(user.uid);
    setClasses(data);
  };

  const loadAllLinks = async () => {
    if (!activity?.id) return;
    try {
      const links = await getMagicLinksForActivity(activity.id);
      setAllLinks(links || []);
      // Pre-fill latest active link URL
      const activeLink = (links || []).find((l: any) => l.isActive !== false);
      if (activeLink) {
        setMagicLinkUrl(`https://braid.studio/#/test/${activeLink.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLink = async () => {
    if (!user || !activity) return;
    setIsCreating(true);
    try {
      let activityToShare = activity;
      // Auto-generate interactive data if missing
      if (!isNonInteractive && !activity.interactiveData?.questions?.length) {
        const interactiveResult = await convertToInteractive(activity.studentContent, activity.answerKey || '', user.uid);
        if (interactiveResult?.questions?.length > 0) {
          await updateActivity(activity.id, { interactiveData: interactiveResult });
          activityToShare = { ...activity, interactiveData: interactiveResult };
        }
      }

      const selectedClass = classes.find(c => c.id === selectedClassId);
      const link = await createMagicLink(user.uid, activityToShare.id, {
        mode: 'test',
        collectName,
        showAnswers: showResults,
        classTagId: selectedClassId,
        classTagName: selectedClass?.name || null,
        includeNotes,
        includeKey
      }, activityToShare);
      const url = `https://braid.studio/#/test/${link.id}`;
      setMagicLinkUrl(url);
      await loadAllLinks();
      toast.success('Magic link created!');
    } catch (err) {
      toast.error('Failed to create link');
    } finally {
      setIsCreating(false);
    }
  };

  // Refresh interactive data for an old activity that has stale/missing JSON
  const handleRefreshInteractiveData = async () => {
    if (!user || !activity) return;
    setIsRefreshingData(true);
    try {
      const result = await convertToInteractive(activity.studentContent, activity.answerKey || '', user.uid);
      if (result?.questions?.length > 0) {
        await updateActivity(activity.id, { interactiveData: result });
        toast.success(`Interactive data refreshed — ${result.questions.length} questions ready`);
      } else {
        toast.error('Could not extract questions. Check the student content.');
      }
    } catch (err) {
      toast.error('Refresh failed');
    } finally {
      setIsRefreshingData(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    try {
      await revokeMagicLink(linkId);
      await loadAllLinks();
      toast.success('Link revoked — students can no longer access it');
    } catch (err) {
      toast.error('Failed to revoke link');
    }
  };

  const handleCopy = (url: string, linkId?: string) => {
    navigator.clipboard.writeText(url);
    if (linkId) {
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    toast.success('Link copied!');
  };

  if (!isOpen) return null;

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const questionCount = activity.interactiveData?.questions?.length || 0;
  const activeLinks   = allLinks.filter((l: any) => l.isActive !== false);
  const hasActiveLink = activeLinks.length > 0;

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-black text-gray-900 uppercase tracking-tight">{activity.title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        {/* Tab bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('print')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'print' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              <FileText size={14} /> Print
            </button>
            <button
              onClick={() => !isPrintOnly && setActiveTab('interactive')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                isPrintOnly
                  ? 'text-gray-300 cursor-not-allowed opacity-50'
                  : activeTab === 'interactive' ? 'bg-coral text-white shadow-sm' : 'text-gray-500'
              }`}
              title={isPrintOnly ? 'This activity type is print only — no interactive quiz available' : undefined}
            >
              <Play size={14} /> Interactive
            </button>
            <button
              onClick={() => !isPrintOnly && setActiveTab('manage')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                isPrintOnly
                  ? 'text-gray-300 cursor-not-allowed opacity-50'
                  : activeTab === 'manage' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
              title={isPrintOnly ? 'This activity type is print only — no magic links available' : undefined}
            >
              <Link size={14} /> Manage Links
              {!isPrintOnly && activeLinks.length > 0 && (
                <span className="ml-1 bg-coral text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {activeLinks.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {isPrintOnly && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
            <FileText size={16} className="text-amber-500 shrink-0" />
            <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
              This is a <span className="uppercase">print-only</span> activity — interactive quiz and magic links are not available for this type.
            </p>
          </div>
        )}

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* ── PRINT TAB ── */}
          {activeTab === 'print' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${includeNotes ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                    {includeNotes && <Check size={12} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} />
                  <span className="text-[10px] font-black uppercase text-gray-600">Teacher Notes</span>
                </label>
                <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${includeKey ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                    {includeKey && <Check size={12} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={includeKey} onChange={e => setIncludeKey(e.target.checked)} />
                  <span className="text-[10px] font-black uppercase text-gray-600">Answer Key</span>
                </label>
              </div>
              <button
                onClick={() => {
                  const win = window.open('', '', 'width=800,height=900');
                  if (win) {
                    win.document.write(`
                      <html><head><title>${activity.title}</title>
                      <style>body{font-family:system-ui,sans-serif;padding:40px;color:#111;}h1{font-size:24px;text-transform:uppercase;margin-bottom:24px;text-align:center;}.content{font-size:14px;line-height:1.8;}.notes{background:#EFF6FF;border:1px solid #BFDBFE;padding:20px;border-radius:12px;margin-bottom:24px;}.notes-title{font-size:11px;font-weight:bold;color:#3B82F6;text-transform:uppercase;margin-bottom:8px;}.answer-key{margin-top:40px;padding-top:24px;border-top:2px dashed #ccc;}.answer-key-title{font-size:18px;font-weight:bold;text-transform:uppercase;margin-bottom:16px;}</style>
                      </head><body>
                      ${includeNotes && activity.teacherNotes ? `<div class="notes"><div class="notes-title">Teacher Notes</div><div>${activity.teacherNotes}</div></div>` : ''}
                      <h1>${(activity.title || '').replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1').replace(/__(.+?)__/g,'$1').replace(/_(.+?)_/g,'$1').replace(/^#+\s*/gm,'').trim()}</h1>
                      <div class="content">${activity.studentContent || ''}</div>
                      ${includeKey && activity.answerKey ? `<div class="answer-key"><div class="answer-key-title">Answer Key</div><div>${activity.answerKey}</div></div>` : ''}
                      </body></html>
                    `);
                    win.document.close();
                    setTimeout(() => { win.print(); win.close(); }, 500);
                  }
                }}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-[11px] uppercase flex items-center justify-center gap-2"
              >
                <FileText size={16} /> Export / Print
              </button>
            </>
          )}

          {/* ── INTERACTIVE TAB ── */}
          {activeTab === 'interactive' && (
            <>
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
                  <span className="text-[10px] font-black uppercase text-gray-600">Teacher Notes</span>
                </label>
                <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${includeKey ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                    {includeKey && <Check size={12} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={includeKey} onChange={e => setIncludeKey(e.target.checked)} />
                  <span className="text-[10px] font-black uppercase text-gray-600">Answer Key</span>
                </label>
              </div>

              {/* Class assignment */}
              <div className="relative">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Assign to Class</p>
                <button onClick={() => setShowClassDropdown(!showClassDropdown)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">{selectedClass ? selectedClass.name : 'No class'}</span>
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

              {/* Interactive data status */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  {questionCount > 0 ? `✓ ${questionCount} questions ready` : '⚠ No interactive questions'}
                </span>
                {!questionCount && (
                  <button
                    onClick={handleRefreshInteractiveData}
                    disabled={isRefreshingData}
                    className="flex items-center gap-1 px-3 py-1.5 bg-coral text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#DC2E4A] transition-all disabled:opacity-50"
                  >
                    {isRefreshingData ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    Refresh Data
                  </button>
                )}
              </div>

              {/* Existing link or create button */}
              {magicLinkUrl ? (
                <div className="p-4 bg-gray-900 rounded-xl space-y-2">
                  <p className="text-[9px] font-black text-gray-500 uppercase">Active Magic Link</p>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={magicLinkUrl} className="flex-1 bg-gray-800 text-white text-xs p-3 rounded-lg" />
                    <button onClick={() => handleCopy(magicLinkUrl)} className={`p-3 rounded-lg ${copied ? 'bg-green-500' : 'bg-coral'} text-white`}>
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={() => setMagicLinkUrl(null)}
                    className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    + Create new link with different settings
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreateLink}
                  disabled={isCreating}
                  className="w-full py-4 bg-coral text-white rounded-xl font-black text-[11px] uppercase flex items-center justify-center gap-2"
                >
                  {isCreating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                  {isCreating ? 'Creating…' : 'Generate Magic Link'}
                </button>
              )}
            </>
          )}

          {/* ── MANAGE LINKS TAB ── */}
          {activeTab === 'manage' && (
            <div className="space-y-3">
              {allLinks.length === 0 ? (
                <div className="text-center py-10 text-gray-300">
                  <Link size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No links created yet</p>
                  <p className="text-[9px] text-gray-300 mt-1">Switch to Interactive tab to create one.</p>
                </div>
              ) : (
                allLinks.map((link: any) => {
                  const linkUrl = `https://braid.studio/#/test/${link.id}`;
                  const isActive = link.isActive !== false;
                  return (
                    <div key={link.id} className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                              {isActive ? 'Active' : 'Revoked'}
                            </span>
                            {link.classTagName && (
                              <span className="text-[8px] font-bold text-gray-400">{link.classTagName}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{linkUrl}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-bold text-gray-400">
                              {formatDate(link.createdAt)}
                            </span>
                            <span className="text-[9px] font-black text-gray-700">
                              {link.responsesCount || 0} response{link.responsesCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {isActive && (
                            <>
                              <button
                                onClick={() => handleCopy(linkUrl, link.id)}
                                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                title="Copy link"
                              >
                                {copiedLinkId === link.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
                              </button>
                              <button
                                onClick={() => handleRevoke(link.id)}
                                className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                title="Revoke link"
                              >
                                <Trash2 size={14} className="text-red-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isActive && link.responsesCount > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5">
                          <AlertCircle size={10} className="text-amber-500" />
                          <p className="text-[8px] font-bold text-amber-600">
                            Revoking will prevent students from accessing this link. Existing responses are preserved.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
