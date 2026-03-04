import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  XCircle, 
  History,
  Filter,
  ChevronDown
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Activity } from '../../types';
import { getClassTags } from '../../services/firestoreService';

interface SessionResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity;
}

export const SessionResultsModal: React.FC<SessionResultsModalProps> = ({ isOpen, onClose, activity }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  
  const [classTagsMap, setClassTagsMap] = useState<Record<string, string>>({});
  const [sessionStats, setSessionStats] = useState<Record<string, { count: number, avgScore: number | null }>>({});
  const [filterTagId, setFilterTagId] = useState<string>('ALL');

  useEffect(() => {
    if (isOpen && user && activity) {
      loadSessions();
    }
  }, [isOpen, user, activity?.id]);

  const loadSessions = async () => {
    if (!user || !activity) return;
    setIsLoadingSessions(true);
    try {
      // Fetch Class Tags
      const tags = await getClassTags(user.uid, true);
      const tagMap: Record<string, string> = {};
      tags.forEach(t => tagMap[t.id] = t.name);
      setClassTagsMap(tagMap);

      // Fetch Sessions
      const q = db.collection('magicLinks')
        .where('activityId', '==', activity.id)
        .where('userId', '==', user.uid);
      
      const snapshot = await q.get();
      let links = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      
      // Sort by createdAt desc
      links.sort((a: any, b: any) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds * 1000 || 0);
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds * 1000 || 0);
          return tB - tA;
      });
      
      setSessions(links);

      // Fetch Stats
      const stats: Record<string, any> = {};
      await Promise.all(links.map(async (link) => {
          const respSnap = await db.collection('magicLinks').doc(link.id).collection('responses').get();
          const count = respSnap.size;
          let totalScore = 0;
          let totalMax = 0;
          respSnap.docs.forEach(doc => {
              const d = doc.data();
              totalScore += d.score || 0;
              totalMax += d.totalQuestions || 0;
          });
          
          let avg = null;
          if (totalMax > 0) {
              avg = Math.round((totalScore / totalMax) * 100);
          }
          stats[link.id] = { count, avgScore: avg };
      }));
      setSessionStats(stats);

      if (links.length > 0) {
        setSelectedSessionId(links[0].id);
        loadResponses(links[0].id);
      }
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadResponses = async (sessionId: string) => {
    try {
      const snapshot = await db.collection('magicLinks').doc(sessionId).collection('responses').get();
      let data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      
      // Sort by score descending (highest first)
      data.sort((a: any, b: any) => {
          const scoreA = (a.score || 0) / (a.totalQuestions || 1);
          const scoreB = (b.score || 0) / (b.totalQuestions || 1);
          return scoreB - scoreA;
      });
      
      setResponses(data);
      if (data.length > 0) setSelectedStudent(data[0]);
      else setSelectedStudent(null);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown Date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  const cleanAnswer = (text: string) => {
    if (!text) return '';
    return text.replace(/^[A-Da-d][\.\)]\s*/, '');
  };

  const filteredSessions = sessions.filter(s => {
      if (filterTagId === 'ALL') return true;
      if (filterTagId === 'UNASSIGNED') return !s.classTagId;
      return s.classTagId === filterTagId;
  });

  // Get unique tags from sessions for the filter
  const sessionTags = Array.from(new Set(sessions.map(s => s.classTagId).filter(Boolean)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-[40px] w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <History size={24} className="text-coral" />
            <h2 className="text-xl font-black uppercase text-gray-900">Session Results</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-colors"><X size={24} /></button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {/* COLUMN 1: SESSION HISTORY */}
          <div className="w-80 border-r border-gray-100 bg-gray-50/30 flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
               <div className="relative">
                 <select 
                   value={filterTagId} 
                   onChange={(e) => setFilterTagId(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wide appearance-none outline-none focus:border-coral transition-all cursor-pointer"
                 >
                   <option value="ALL">All Classes</option>
                   {sessionTags.map(tagId => (
                     <option key={tagId as string} value={tagId as string}>{classTagsMap[tagId as string] || 'Unknown Class'}</option>
                   ))}
                   <option value="UNASSIGNED">Unassigned</option>
                 </select>
                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingSessions ? (
                <div className="text-center p-4 text-xs font-bold text-gray-400">Loading sessions...</div>
                ) : filteredSessions.length === 0 ? (
                <div className="text-center p-4 text-xs font-bold text-gray-400">No sessions found</div>
                ) : (
                filteredSessions.map(s => {
                    const stats = sessionStats[s.id] || { count: 0, avgScore: null };
                    const isSelected = selectedSessionId === s.id;
                    return (
                        <button 
                            key={s.id} 
                            onClick={() => { setSelectedSessionId(s.id); loadResponses(s.id); }} 
                            className={`w-full p-4 rounded-2xl text-left border transition-all ${isSelected ? 'bg-white border-coral shadow-md scale-[1.02]' : 'bg-white border-gray-100 hover:border-coral/30'}`}
                        >
                            <div className="flex flex-col gap-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${s.classTagId ? 'text-coral' : 'text-gray-400'}`}>
                                    {s.classTagId ? (classTagsMap[s.classTagId] || 'Unknown Class') : 'Unassigned'}
                                </span>
                                <span className="text-xs font-bold text-gray-900">
                                    {formatDate(s.createdAt)}
                                </span>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                    <span className="text-[10px] font-bold text-gray-500">{stats.count} Students</span>
                                    <span className={`text-[10px] font-black ${stats.avgScore !== null ? 'text-success' : 'text-gray-300'}`}>
                                        {stats.avgScore !== null ? `${stats.avgScore}% Avg` : 'No Data'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })
                )}
            </div>
          </div>

          {/* COLUMN 2: STUDENT PERFORMANCE */}
          <div className="w-80 border-r border-gray-100 flex flex-col bg-white">
             {/* Header with Total Submissions */}
             <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Students</h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-black">{responses.length} Submissions</span>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {responses.map(r => {
                   const isSelected = selectedStudent?.id === r.id;
                   const percentage = (r.score / (r.totalQuestions || 1)) * 100;
                   
                   let rowClass = 'bg-gray-50 border-gray-200 hover:border-gray-300';
                   let badgeClass = 'text-gray-600 bg-gray-200/50';
                   
                   if (percentage >= 80) {
                      rowClass = 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-200';
                      badgeClass = 'text-emerald-700 bg-emerald-100/50';
                   } else if (percentage >= 50) {
                      rowClass = 'bg-amber-50/50 border-amber-100 hover:border-amber-200';
                      badgeClass = 'text-amber-700 bg-amber-100/50';
                   }
                   
                   const containerClass = isSelected 
                      ? 'bg-white border-l-4 border-l-coral border-y border-r border-gray-100 shadow-sm scale-[1.02]' 
                      : `${rowClass} border`;

                   return (
                      <button 
                        key={r.id} 
                        onClick={() => setSelectedStudent(r)} 
                        className={`w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between group ${containerClass}`}
                      >
                        <h4 className="text-xs font-bold text-gray-900 truncate pr-2">{r.studentName}</h4>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${badgeClass}`}>
                           {r.score}/{r.totalQuestions}
                        </span>
                      </button>
                   );
                })}
             </div>
          </div>

          {/* COLUMN 3: DETAILS */}
          <div className="flex-1 bg-gray-50/20 p-8 overflow-y-auto">
            {selectedStudent ? (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Summary Card */}
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black uppercase text-gray-900">{selectedStudent.studentName}</h3>
                    <div className="flex items-center gap-2 mt-2 text-gray-400">
                       <History size={16} />
                       <span className="text-sm font-bold uppercase tracking-wide">
                         {selectedStudent.submittedAt ? formatDate(selectedStudent.submittedAt) : 'Unknown Date'}
                       </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-black text-gray-900 tracking-tighter">
                      {Math.round((selectedStudent.score / (selectedStudent.totalQuestions || 1)) * 100)}%
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase mt-1">
                      {selectedStudent.score} / {selectedStudent.totalQuestions} Correct
                    </p>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  {selectedStudent.answers?.map((ans: any, i: number) => {
                    const question = activity.interactiveData?.questions?.find((q: any) => q.id === ans.questionId);
                    const isCorrect = ans.isCorrect;
                    const cleanStudentAnswer = cleanAnswer(ans.value);
                    const cleanCorrectAnswer = question ? cleanAnswer(question.correctAnswer) : '';
                    
                    // Fallback if no interactive data or question not found
                    if (!question) {
                       return (
                          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}>
                              {isCorrect ? <Check size={20} /> : <X size={20} />}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-400 uppercase mb-1">Question {i + 1}</p>
                              <p className={`text-lg font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                                {cleanStudentAnswer || '(No Answer)'}
                              </p>
                            </div>
                          </div>
                       );
                    }

                    return (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="mb-4">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Question {i + 1}</span>
                          <p className="text-lg font-medium text-gray-900 leading-relaxed">{question.question || question.text}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50">
                          {isCorrect ? (
                            <>
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <Check size={14} strokeWidth={3} />
                              </div>
                              <span className="text-base font-bold text-emerald-600">{cleanStudentAnswer}</span>
                            </>
                          ) : (
                            <>
                              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0">
                                <X size={14} strokeWidth={3} />
                              </div>
                              <span className="text-base font-bold text-red-500">
                                {cleanStudentAnswer || '(No Answer)'} <span className="text-gray-500 font-medium ml-1">(Correct: {cleanCorrectAnswer})</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                 <div className="w-24 h-24 bg-gray-200 rounded-full mb-6"></div>
                 <div className="font-black uppercase text-xl text-gray-400">Select a student</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
