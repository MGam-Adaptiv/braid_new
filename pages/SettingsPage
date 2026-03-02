import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { getClassTags, createClassTag, deleteClassTag } from '../services/firestoreService';
import { User, Bell, Shield, LogOut, ChevronRight, School, Plus, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadClasses();
  }, [user]);

  const loadClasses = async () => {
    if (!user) return;
    const data = await getClassTags(user.uid);
    setClasses(data);
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !user) return;
    setLoading(true);
    try {
      await createClassTag(user.uid, newClassName, '2024-2025', '#EF3D5A');
      setNewClassName('');
      loadClasses();
      toast.success('Class created');
    } catch (error) {
      toast.error('Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
      await deleteClassTag(classId);
      loadClasses();
      toast.success('Class deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      <div className="pt-24 px-6 max-w-5xl mx-auto pb-20">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">Settings</h1>
        <p className="text-sm font-medium text-gray-500 mb-8">Manage your account, preferences, and classes</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* SIDEBAR */}
          <div className="space-y-2">
            {[
              { id: 'profile', label: 'My Profile', icon: User },
              { id: 'classes', label: 'Manage Classes', icon: School },
              { id: 'security', label: 'Security', icon: Shield },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-white hover:text-gray-900'}`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
            <div className="pt-4 border-t border-gray-200 mt-4">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 text-sm font-bold transition-colors">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="md:col-span-3 space-y-6">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black" style={{ backgroundColor: userProfile?.avatarColor || '#EF3D5A' }}>
                    {userProfile?.displayName?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{userProfile?.displayName || 'User'}</h3>
                    <p className="text-sm text-gray-400">{user.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 uppercase">{userProfile?.role || 'Teacher'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* CLASSES TAB (RESTORED) */}
            {activeTab === 'classes' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2"><School className="text-coral" /> My Classes</h3>
                  
                  <div className="flex gap-4 mb-8">
                    <input 
                      value={newClassName} 
                      onChange={(e) => setNewClassName(e.target.value)} 
                      placeholder="Enter new class name..." 
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-coral transition-colors"
                    />
                    <button onClick={handleCreateClass} disabled={loading} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-colors flex items-center gap-2">
                      <Plus size={14} /> Add Class
                    </button>
                  </div>

                  <div className="space-y-3">
                    {classes.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm font-medium">No classes found. Create one above!</div>
                    ) : (
                      classes.map((cls) => (
                        <div key={cls.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-gray-200 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm text-gray-400">
                              <Users size={18} />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{cls.name}</div>
                              <div className="text-xs text-gray-400 font-medium">{cls.studentCount || 0} Students</div>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteClass(cls.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6">Security Settings</h3>
                <button className="w-full text-left p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-coral transition-all flex justify-between items-center group">
                  <div>
                    <div className="font-bold text-gray-900">Change Password</div>
                    <div className="text-xs text-gray-400">Update your login credentials</div>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-coral transition-colors" />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
