import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  XCircle, 
  History,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Activity } from '../../types';

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

  useEffect(() => {
    if (isOpen && user && activity) {
      loadSessions();
    }
  }, [isOpen, user, activity?.id]);

  const loadSessions = async () => {
    if (!user || !activity) return;
    setIsLoadingSessions(true);
    try {
      const q = db.collection('magicLinks')
        .where('activityId', '==', activity.id)
        .where('userId', '==', user.uid);
      
      const snapshot = await q.get();
      let links = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      links.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setSessions(links);
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
      data.sort((a: any, b: any) => (b.submittedAt || 0) - (a.submittedAt || 0));
      setResponses(data);
      if (data.length > 0) setSelectedStudent(data[0]);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-[40px] w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <History size={24} className="text-coral" />
            <h2 className="text-xl font-black uppercase text-gray-900">Session Results</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 rounded-2xl"><X size={24} /></button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-gray-100 bg-gray-50/30 overflow-y-auto p-4 space-y-2">
            {isLoadingSessions ? (
               <div className="text-center p-4 text-xs font-bold text-gray-400">Loading sessions...</div>
            ) : sessions.length === 0 ? (
               <div className="text-center p-4 text-xs font-bold text-gray-400">No sessions found</div>
            ) : (
               sessions.map(s => <button key={s.id} onClick={() => { setSelectedSessionId(s.id); loadResponses(s.id); }} className={`w-full p-4 rounded-2xl text-left border ${selectedSessionId === s.id ? 'bg-white border-coral shadow-sm' : 'border-transparent'}`}><h4 className="text-xs font-black uppercase">Session {s.id.slice(0, 8)}</h4></button>)
            )}
          </div>
          <div className="w-80 border-r border-gray-100 overflow-y-auto p-4 space-y-2 bg-white">
            {responses.map(r => <button key={r.id} onClick={() => setSelectedStudent(r)} className={`w-full p-4 rounded-2xl text-left border ${selectedStudent?.id === r.id ? 'bg-gray-900 text-white' : 'bg-white border-gray-100'}`}><h4 className="text-xs font-black uppercase">{r.studentName}</h4></button>)}
          </div>
          <div className="flex-1 bg-gray-50/20 p-8 overflow-y-auto">
            {selectedStudent ? (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 text-center">
                  <h3 className="text-2xl font-black uppercase">{selectedStudent.studentName}</h3>
                  <p className="text-lg font-black text-success mt-2">{selectedStudent.score} / {selectedStudent.totalQuestions} Correct</p>
                </div>
                {selectedStudent.answers?.map((ans: any, i: number) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${ans.isCorrect ? 'bg-success' : 'bg-coral'}`}>{ans.isCorrect ? <Check size={14} /> : <XCircle size={14} />}</div>
                    <p className="text-sm font-bold uppercase">{ans.value || '(No Answer)'}</p>
                  </div>
                ))}
              </div>
            ) : <div className="h-full flex items-center justify-center opacity-30 font-black uppercase text-[10px]">Select a student</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
