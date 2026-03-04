import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMagicLink, getActivity, saveStudentResponse } from '../services/firestoreService';
import { getUserProfile } from '../services/userService';
import { Activity, ActivityQuestion } from '../types';
import { Logo } from '../components/Logo';
import { 
  Check, 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle, 
  Trophy, 
  Sparkles, 
  BookOpen, 
  X, 
  ChevronDown, 
  XCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Edit
} from 'lucide-react';

const cleanMd = (text: string) => {
  return text ? text.replace(/\*\*/g, '').replace(/[#~]/g, '').replace(/_{2,}/g, '__').trim() : '';
};

export const TestPage: React.FC = () => {
  const { id: magicLinkId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<any>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [teacherLogo, setTeacherLogo] = useState<string | null>(null);
  
  const [step, setStep] = useState<'welcome' | 'activity' | 'results'>('welcome');
  const [studentName, setStudentName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number, total: number, percentage: number } | null>(null);

  const [showExitModal, setShowExitModal] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [activityTitle, setActivityTitle] = useState<string>('Activity');
  const [instructions, setInstructions] = useState<string>('Complete the activity below.');
  const [teacherNotes, setTeacherNotes] = useState<string | null>(null);
  const [answerKey, setAnswerKey] = useState<string | null>(null);
  const [showNotesAndKey, setShowNotesAndKey] = useState<{ notes: boolean, key: boolean }>({ notes: false, key: false });

  useEffect(() => {
    const init = async () => {
      if (!magicLinkId) return;
      setLoading(true);
      try {
        const link = await getMagicLink(magicLinkId);
        if (!link) {
          setError("Activity not found.");
          setLoading(false);
          return;
        }
        setMagicLink(link);
        console.log('Magic link config:', link);
        
        // Fetch Teacher Profile for branding
        const teacherProfile = await getUserProfile(link.userId);
        if (teacherProfile?.schoolLogoURL) {
          setTeacherLogo(teacherProfile.schoolLogoURL);
        }

        let currentActivity: Activity | null = null;
        let questionsToUse: ActivityQuestion[] = [];
        let wordBankToUse: string[] = [];
        let instructionsToUse = 'Complete the activity below.';
        let titleToUse = 'Activity';

        // Check if link has content snapshot (new behavior)
        if (link.content && link.content.questions && link.content.questions.length > 0) {
          questionsToUse = link.content.questions;
          wordBankToUse = link.content.wordBank || [];
          instructionsToUse = link.content.instructions || instructionsToUse;
          titleToUse = link.content.title || titleToUse;
          
          // If using snapshot, we skip fetching activity unless absolutely necessary.
          // User requested: "Only fall back to fetching the activity ... if link.content is missing"
          // So we do NOT fetch activity here.
        } else {
          // Fallback: Fetch activity
          const act = await getActivity(link.activityId);
          if (!act) {
            setError("Content missing.");
            setLoading(false);
            return;
          }
          setActivity(act);
          currentActivity = act;
          titleToUse = act.title || 'Activity';

          if (act.interactiveData && act.interactiveData.questions && act.interactiveData.questions.length > 0) {
            questionsToUse = act.interactiveData.questions;
            wordBankToUse = act.interactiveData.wordBank || [];
            instructionsToUse = act.interactiveData.instructions || instructionsToUse;
          }
          
          if (link.includeNotes && act.teacherNotes) {
            setTeacherNotes(act.teacherNotes);
            setShowNotesAndKey(prev => ({ ...prev, notes: true }));
          }
          if ((link.includeKey || link.showAnswers) && act.answerKey) {
            setAnswerKey(act.answerKey);
            setShowNotesAndKey(prev => ({ ...prev, key: true }));
          }
        }

        setQuestions(questionsToUse);
        setWordBank(wordBankToUse);
        setInstructions(instructionsToUse);
        setActivityTitle(titleToUse);

        if (!link.collectName) {
          setStep('activity');
        }
      } catch (err) {
        console.error("DEBUG: Init failed:", err);
        setError("Connection failed.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [magicLinkId]);

  useEffect(() => {
    if (questions.length > 0) {
      const initialAnswers: Record<number, any> = {};
      let hasUpdates = false;
      
      questions.forEach(q => {
        if (q.type === 'ordering' && q.options && !answers[q.id]) {
          initialAnswers[q.id] = [...q.options];
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        setAnswers(prev => ({ ...prev, ...initialAnswers }));
      }
    }
  }, [questions]);

  const isAnswerCorrect = (qId: number): boolean => {
    // 1. Try to use interactiveData from activity if available
    // We prioritize this because link.content might have stripped answers or be stale
    if (activity?.interactiveData?.questions) {
        // Use loose equality or explicit conversion to ensure we match string/number IDs correctly
        const q = activity.interactiveData.questions.find((q: any) => Number(q.id) === qId);
        if (q) {
            const studentAns = answers[qId];
            
            if (q.type === 'open-ended') {
                return Boolean(studentAns && String(studentAns).trim().length > 0);
            }

            if (q.type === 'matching') {
                 const pairs = q.pairs || [];
                 if (pairs.length === 0) return false;
                 const userMap = studentAns || {};
                 return pairs.every((p: any) => userMap[p.left] === p.right);
            }
            
             if (q.type === 'ordering') {
                return JSON.stringify(studentAns) === JSON.stringify(q.correctAnswer);
             }

            // Multi-select or array comparison
            if (Array.isArray(q.correctAnswer) && Array.isArray(studentAns)) {
                 const sortedCorrect = [...q.correctAnswer].sort().map(s => String(s).toLowerCase().trim());
                 const sortedStudent = [...studentAns].sort().map(s => String(s).toLowerCase().trim());
                 return JSON.stringify(sortedCorrect) === JSON.stringify(sortedStudent);
            }

            if (q.correctAnswer) {
                let correct = String(q.correctAnswer).toLowerCase().trim();
                const student = String(studentAns || '').toLowerCase().trim();

                // Safety net: If correctAnswer is a single letter (A-D) but student answer is text,
                // try to map the letter to the option text.
                if (correct.length === 1 && q.options && q.options.length > 0) {
                    const letterMatch = correct.match(/^[a-d]$/); // already lowercased
                    if (letterMatch) {
                        const index = correct.charCodeAt(0) - 97; // a=0, b=1...
                        if (index >= 0 && index < q.options.length) {
                             correct = String(q.options[index]).toLowerCase().trim();
                        }
                    }
                }

                // Case-insensitive string comparison for multiple-choice / fill-blank
                return student === correct;
            }
        }
    }

    // Fallback: Use the local 'questions' state (which might come from link.content or activity)
    const question = questions.find(q => q.id === qId);
    if (!question) return false;

    if (question.type === 'open-ended') {
      const ans = answers[qId];
      return Boolean(ans && typeof ans === 'string' && ans.trim().length > 0);
    }

    if (question.type === 'matching') {
      const userAnswer = answers[qId] || {}; 
      const pairs = question.pairs || [];
      if (pairs.length === 0) return false;
      return pairs.every(p => userAnswer[p.left] === p.right);
    }

    if (question.type === 'ordering') {
      const userAnswer = answers[qId]; 
      const correctOrder = question.correctAnswer as string[]; 
      if (!userAnswer || !correctOrder) return false;
      return JSON.stringify(userAnswer) === JSON.stringify(correctOrder);
    }
    
    if (!question.correctAnswer) return false;
    let studentAnswer = String(answers[qId] || '').toLowerCase().trim();
    let correctAnswer = String(question.correctAnswer).toLowerCase().trim();

    // Same safety net for fallback questions
    if (correctAnswer.length === 1 && question.options && question.options.length > 0) {
        const letterMatch = correctAnswer.match(/^[a-d]$/);
        if (letterMatch) {
            const index = correctAnswer.charCodeAt(0) - 97;
            if (index >= 0 && index < question.options.length) {
                 correctAnswer = String(question.options[index]).toLowerCase().trim();
            }
        }
    }

    return studentAnswer === correctAnswer;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length && !showIncompleteWarning) {
      setShowIncompleteWarning(true);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setShowIncompleteWarning(false);

      let score = 0;
      questions.forEach(q => { if (isAnswerCorrect(q.id)) score++; });
      const total = questions.length;

      await saveStudentResponse({
        magicLinkId: magicLinkId!,
        studentName: studentName || 'Anonymous Student',
        answers: Object.entries(answers).map(([id, val]) => ({ 
          questionId: Number(id), 
          value: val, 
          isCorrect: isAnswerCorrect(Number(id))
        })),
        score,
        totalQuestions: total,
        submittedAt: Date.now()
      });

      setResult({ score, total, percentage: total > 0 ? Math.round((score / total) * 100) : 100 });
      setStep('results');
      window.scrollTo(0, 0);
    } catch (err) {
      setError("Submission failed. Connection lost.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveOrderItem = (qId: number, index: number, direction: 'up' | 'down') => {
    const currentList = [...(answers[qId] || [])];
    if (currentList.length === 0) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentList.length) return;
    const temp = currentList[index];
    currentList[index] = currentList[newIndex];
    currentList[newIndex] = temp;
    setAnswers(prev => ({ ...prev, [qId]: currentList }));
  };

  const updateMatching = (qId: number, leftItem: string, selectedRight: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...(prev[qId] || {}), [leftItem]: selectedRight } }));
  };

  const renderMatching = (q: ActivityQuestion, checked: boolean) => {
    const pairs = q.pairs || [];
    const rightOptions = pairs.map(p => p.right).sort(); 
    const userAnswer = answers[q.id] || {};
    return (
      <div className="w-full space-y-3 mt-2">
        {pairs.map((pair, idx) => {
           const isPairCorrect = checked && userAnswer[pair.left] === pair.right;
           const isPairWrong = checked && userAnswer[pair.left] && userAnswer[pair.left] !== pair.right;
           return (
             <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
               <div className="flex-1 font-bold text-gray-700 text-sm">{cleanMd(pair.left)}</div>
               <div className="hidden sm:block text-gray-300">→</div>
               <div className="flex-1 relative">
                 <select
                   disabled={checked}
                   value={userAnswer[pair.left] || ''}
                   onChange={(e) => updateMatching(q.id, pair.left, e.target.value)}
                   className={`w-full p-2.5 rounded-lg text-xs font-black uppercase tracking-wide border-2 outline-none appearance-none cursor-pointer transition-all ${
                     isPairCorrect ? 'bg-success/10 border-success text-success' : 
                     isPairWrong ? 'bg-coral/10 border-coral text-coral' : 
                     'bg-white border-gray-200 focus:border-coral'
                   }`}
                 >
                   <option value="">Select match...</option>
                   {rightOptions.map((opt, i) => <option key={i} value={opt}>{cleanMd(opt)}</option>)}
                 </select>
                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
               </div>
             </div>
           );
        })}
      </div>
    );
  };

  const renderOrdering = (q: ActivityQuestion, checked: boolean) => {
    const currentList = answers[q.id] || [];
    return (
      <div className="w-full space-y-2 mt-2">
        {currentList.map((item: string, idx: number) => (
          <div key={idx} className="flex items-center gap-3 bg-white border-2 border-gray-100 p-3 rounded-xl shadow-sm">
            <div className="flex flex-col gap-1">
               <button disabled={checked || idx === 0} onClick={() => moveOrderItem(q.id, idx, 'up')} className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20"><ArrowUp size={14} /></button>
               <button disabled={checked || idx === currentList.length - 1} onClick={() => moveOrderItem(q.id, idx, 'down')} className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20"><ArrowDown size={14} /></button>
            </div>
            <div className="flex-1 text-sm font-bold text-gray-700">{cleanMd(item)}</div>
            <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
          </div>
        ))}
        {checked && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Correct Order:</p>
             <ol className="list-decimal pl-5 space-y-1">
               {(q.correctAnswer as string[] || []).map((ans, i) => <li key={i} className="text-xs font-bold text-success">{cleanMd(ans)}</li>)}
             </ol>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><RefreshCw className="w-10 h-10 text-coral animate-spin" /></div>;
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-sm border border-gray-100 flex flex-col items-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-6" />
        <h2 className="text-xl font-black uppercase mb-4 tracking-tight">{error}</h2>
        <button onClick={() => navigate('/')} className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Return Home</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans pb-20">
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-[150]">
        <div className="h-full bg-coral transition-all duration-500 ease-out" style={{ width: `${(Object.keys(answers).length / (questions.length || 1)) * 100}%` }} />
      </div>

      <div className="fixed top-4 right-6 z-[160]">
        <button onClick={() => step === 'activity' ? setShowExitModal(true) : navigate('/')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full shadow-lg hover:border-coral/40 transition-all active:scale-95 group">
          <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-coral transition-colors">Exit Session</span>
          <X className="w-4 h-4 text-gray-300 group-hover:text-coral transition-colors" />
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        {step === 'welcome' && (
          <div className="text-center bg-white border border-gray-100 rounded-[48px] p-12 md:p-16 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="absolute top-0 left-0 w-full h-3 bg-coral" />
            
            {/* BRANDING LOGIC */}
            <div className="mb-10 flex flex-col items-center justify-center">
              {teacherLogo ? (
                <div className="h-16 flex items-center justify-center mb-2">
                  <img src={teacherLogo} alt="School Logo" className="h-full object-contain" />
                </div>
              ) : (
                <Logo size="sm" layout="vertical" />
              )}
            </div>

            <h1 className="text-3xl font-black uppercase mb-4 leading-tight tracking-tight text-gray-900">{cleanMd(activityTitle)}</h1>
            <p className="text-sm text-gray-500 mb-8">{instructions}</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full mb-8">
              <Sparkles size={14} className="text-coral" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{questions.length} Questions</span>
            </div>
            
            {magicLink?.collectName && (
              <div className="max-w-xs mx-auto mb-10 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2.5 ml-1">Your Name</label>
                <input type="text" value={studentName} onChange={e => { setStudentName(e.target.value); setNameError(null); }} placeholder="Enter your full name..." className={`w-full h-16 px-6 bg-white border-2 rounded-2xl font-bold text-gray-800 outline-none focus:ring-4 focus:ring-coral/5 transition-all shadow-inner ${nameError ? 'border-coral' : 'border-gray-200 focus:border-coral'}`} />
                {nameError && <p className="mt-2 text-[10px] font-black text-coral uppercase tracking-widest ml-1 animate-in fade-in">{nameError}</p>}
              </div>
            )}
            
            <button onClick={() => (magicLink?.collectName && !studentName.trim()) ? setNameError("Please enter your name") : setStep('activity')} className="w-full py-5 bg-coral text-white rounded-[28px] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-coral/30 hover:bg-[#DC2E4A] transition-all active:scale-95">Start Session <ArrowRight size={20} strokeWidth={3} /></button>
          </div>
        )}

        {step === 'activity' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-coral rounded-2xl flex items-center justify-center text-white shadow-lg shadow-coral/20">
                   {teacherLogo ? <img src={teacherLogo} className="w-6 h-6 object-contain filter invert brightness-0" /> : <BookOpen size={20} />}
                 </div>
                 <div>
                    <h2 className="text-sm font-black uppercase text-gray-900 tracking-tight">{cleanMd(activityTitle)}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{studentName || 'Student Access'}</p>
                 </div>
              </div>
              <div className="px-4 py-2 bg-white border border-gray-100 rounded-2xl text-[10px] font-black text-gray-500 uppercase tracking-widest shadow-sm">{Object.keys(answers).length} / {questions.length} Answered</div>
            </div>

            <div className="space-y-6 mb-14">
              {questions.map(q => {
                const checked = checkedAnswers[q.id];
                const correct = checked ? isAnswerCorrect(q.id) : false;
                const isOpenEnded = q.type === 'open-ended';
                
                const bubbleColor = checked 
                  ? (isOpenEnded ? 'bg-blue-500 border-blue-500 text-white' : (correct ? 'bg-success border-success text-white' : 'bg-coral border-coral text-white'))
                  : 'bg-gray-50 border-gray-100 text-gray-400 group-hover:border-coral/40 group-hover:text-coral';
                
                const borderColor = checked
                  ? (isOpenEnded ? 'border-blue-100 bg-blue-50/20' : (correct ? 'border-success/30 bg-success/[0.02]' : 'border-coral/30 bg-coral/[0.02]'))
                  : 'border-gray-100 hover:border-coral/20 shadow-sm';

                const availableOptions = q.options && q.options.length > 0 ? q.options : wordBank.length > 0 ? wordBank : [];

                return (
                  <div key={q.id} className={`bg-white rounded-[28px] p-6 sm:p-8 border-2 transition-all duration-300 flex flex-col gap-4 group ${borderColor}`}>
                    <div className="flex items-start gap-5">
                       <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black border-2 transition-all ${bubbleColor}`}>
                          {checked ? (isOpenEnded ? <Edit size={16} /> : (correct ? <Check size={18} strokeWidth={4} /> : <X size={18} strokeWidth={4} />)) : q.id}
                       </span>
                       <div className="flex-1 pt-1.5">
                          <p className={`text-[16px] font-bold uppercase tracking-tight leading-relaxed transition-all duration-300 ${checked && !isOpenEnded ? (correct ? 'text-success/80' : 'text-coral/80') : 'text-gray-700'}`}>
                            {cleanMd(q.question)}
                          </p>
                       </div>
                    </div>

                    <div className="pl-14"> 
                      {q.type === 'matching' && renderMatching(q, !!checked)}
                      {q.type === 'ordering' && renderOrdering(q, !!checked)}
                      
                      {q.type === 'true-false' && (
                          <div className="flex gap-2 max-w-md">
                            {['True', 'False'].map(opt => (
                              <button key={opt} onClick={() => { setAnswers(p => ({ ...p, [q.id]: opt })); if (magicLink?.mode === 'practice') setCheckedAnswers(p => { const n = {...p}; delete n[q.id]; return n; }); }} disabled={magicLink?.mode === 'practice' && checked && correct} className={`flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all border-2 ${answers[q.id] === opt ? 'bg-coral text-white border-coral shadow-lg' : 'bg-white border-gray-200 text-gray-500 hover:border-coral/30'}`}>{opt}</button>
                            ))}
                          </div>
                      )}

                      {q.type === 'open-ended' && (
                          <textarea value={answers[q.id] || ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} placeholder="Type your answer..." className="w-full h-24 px-4 py-3 bg-white border-2 border-gray-100 rounded-xl font-medium text-sm outline-none focus:border-coral transition-all resize-none" />
                      )}

                      {(q.type === 'multiple-choice' || q.type === 'fill-blank') && (
                        availableOptions.length > 0 ? (
                          <div className="relative">
                            <select value={answers[q.id] || ''} onChange={e => { setAnswers(p => ({ ...p, [q.id]: e.target.value })); if (magicLink?.mode === 'practice') setCheckedAnswers(p => { const n = {...p}; delete n[q.id]; return n; }); setShowIncompleteWarning(false); }} disabled={magicLink?.mode === 'practice' && checked && correct} className={`appearance-none w-full h-14 px-6 bg-white border-2 rounded-2xl font-black text-[12px] uppercase tracking-widest outline-none transition-all cursor-pointer ${answers[q.id] ? 'border-coral/20 bg-coral/[0.02] text-coral' : 'border-gray-100 focus:border-coral'}`}>
                              <option value="">Choose answer...</option>
                              {availableOptions.map((opt, idx) => <option key={idx} value={opt} className="text-gray-900">{cleanMd(opt)}</option>)}
                            </select>
                            <ChevronDown size={16} className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${answers[q.id] ? 'text-coral' : 'text-gray-300'}`} />
                          </div>
                        ) : (
                          <input type="text" value={answers[q.id] || ''} onChange={e => { setAnswers(p => ({ ...p, [q.id]: e.target.value })); setShowIncompleteWarning(false); }} placeholder="Type your answer..." className="w-full h-14 px-6 bg-white border-2 border-gray-100 rounded-2xl font-black text-[12px] uppercase tracking-widest outline-none focus:border-coral transition-all" />
                        )
                      )}
                      
                      {magicLink?.mode === 'practice' && answers[q.id] && (!checked || !correct) && (
                        <div className="mt-4">
                           <button onClick={() => setCheckedAnswers(p => ({ ...p, [q.id]: true }))} className="px-5 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/10 active:scale-95">Check Answer</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-8 left-0 right-0 flex flex-col items-center gap-4 px-6">
              {showIncompleteWarning && (
                <div className="w-full max-w-md bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1">Incomplete Activity</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase leading-relaxed">Please try to answer all questions before submitting.</p>
                  </div>
                </div>
              )}
              <button onClick={handleSubmit} disabled={isSubmitting} className={`max-w-md w-full py-5 text-white rounded-[28px] font-black text-sm uppercase tracking-[0.25em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] ${showIncompleteWarning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-900 hover:bg-black'}`}>
                {isSubmitting ? <RefreshCw className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
                {isSubmitting ? 'Submitting...' : showIncompleteWarning ? 'Submit Anyway' : 'Submit Answers'}
              </button>
            </div>
          </div>
        )}

        {step === 'results' && result && (
          <div className="animate-in zoom-in-95 duration-500 space-y-12">
            <div className="bg-white rounded-[48px] shadow-2xl border border-gray-100 p-12 md:p-20 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-3 bg-success" />
              <div className="w-24 h-24 bg-success/10 text-success rounded-[36px] flex items-center justify-center mx-auto mb-10 animate-bounce">
                 <Trophy size={48} strokeWidth={2.5} />
              </div>
              <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 text-gray-900">Great Job!</h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest mb-14 leading-relaxed">{studentName ? `${studentName}, you've` : "You've"} successfully completed the session.</p>
              
              <div className="inline-block px-14 py-12 bg-gray-50 rounded-[56px] border border-gray-100 mb-14 shadow-inner">
                {questions.every(q => q.type === 'open-ended') ? (
                  <>
                    <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-5">Status</p>
                    <div className="flex flex-col items-center">
                      <p className="text-4xl font-black text-gray-900 mb-2 leading-none tracking-tight">Submitted</p>
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Pending Review</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mb-5">Accuracy Score</p>
                    <div className="flex flex-col items-center">
                      <p className="text-8xl font-black text-gray-900 mb-2 leading-none tracking-tighter">{result.percentage}%</p>
                      <p className="text-base font-black text-success uppercase tracking-widest">{result.score} Correct <span className="text-gray-300 mx-2">/</span> {result.total} Total</p>
                    </div>
                  </>
                )}
              </div>

              {showNotesAndKey.notes && teacherNotes && (
                <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl text-left max-w-2xl mx-auto">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Teacher Notes</h3>
                  <div className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{teacherNotes}</div>
                </div>
              )}

              {showNotesAndKey.key && answerKey && (
                <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-2xl text-left max-w-2xl mx-auto">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Answer Key</h3>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{answerKey}</div>
                </div>
              )}

              <div className="flex flex-col gap-4 max-w-sm mx-auto mt-8">
                <button onClick={() => navigate('/')} className="w-full py-5 bg-coral text-white rounded-[28px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-coral/30 hover:bg-[#DC2E4A] transition-all flex items-center justify-center gap-3 active:scale-95">Done & Exit Session <ArrowRight size={20} strokeWidth={3} /></button>
              </div>
            </div>
          </div>
  )}
      </div>

      {showExitModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-10 text-center">
              <AlertCircle size={32} className="text-coral mx-auto mb-6" />
              <h3 className="text-xl font-black uppercase tracking-tight mb-3 text-gray-900">Discard Progress?</h3>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed mb-10">Are you sure you want to exit? Your answers for this session will be lost.</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => navigate('/')} className="w-full py-4 bg-coral text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-coral/20 hover:bg-[#DC2E4A] transition-all">Yes, Exit Session</button>
                <button onClick={() => setShowExitModal(false)} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-100 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

