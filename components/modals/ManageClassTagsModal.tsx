import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  createClassTag, 
  getClassTags, 
  deleteClassTag
} from '../../services/firestoreService';
import { ClassTag } from '../../types';
import toast from 'react-hot-toast';

interface ManageClassTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageClassTagsModal: React.FC<ManageClassTagsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [tags, setTags] = useState<ClassTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      loadTags();
    }
  }, [user, isOpen]);

  const loadTags = async () => {
    if (!user) return;
    try {
      const data = await getClassTags(user.uid);
      setTags(data);
    } catch (error) {
      console.error("Failed to load tags", error);
    }
  };

  const handleCreate = async () => {
    if (!user || !newTagName.trim()) return;
    setLoading(true);
    try {
      await createClassTag(user.uid, newTagName, '2024-2025', '#EF3D5A');
      setNewTagName('');
      await loadTags();
      toast.success("Class tag created");
    } catch (error) {
      toast.error("Failed to create tag");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteClassTag(id);
      await loadTags();
      toast.success("Tag deleted");
    } catch (error) {
      toast.error("Failed to delete tag");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
            Manage Classes
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex gap-2 mb-6">
            <input 
              value={newTagName} 
              onChange={(e) => setNewTagName(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Enter class name..." 
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm focus:border-coral outline-none transition-all"
            />
            <button onClick={handleCreate} disabled={loading || !newTagName} className="px-4 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors disabled:opacity-50">
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {tags.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">No classes found</div>
            ) : (
              tags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-coral/30 transition-colors group bg-white hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-coral/10 rounded-lg flex items-center justify-center text-coral font-bold">
                      <Users size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{tag.name}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tag.studentCount || 0} Students</div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(tag.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
