import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { getClassTags, createClassTag, deleteClassTag } from '../services/firestoreService';
import { saveTeacherProfile } from '../services/userService';
import { auth, db, storage, serverTimestamp } from '../lib/firebase';
import {
  User, Shield, LogOut, ChevronRight, School, Plus, Trash2, Users,
  CheckCircle2, MapPin, BookOpen, Save, Camera, Lock, Eye, EyeOff,
  Download, AlertTriangle, RefreshCw, Mail, KeyRound, ShieldCheck,
  EyeOff as PrivacyIcon, FileText, Trash, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Location Data ────────────────────────────────────────────────────────────
const LOCATION_DATA: Record<string, string[]> = {
  Argentina:        ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Tucumán', 'Mar del Plata', 'Other'],
  Australia:        ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Other'],
  Austria:          ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Other'],
  Brazil:           ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Curitiba', 'Recife', 'Other'],
  Canada:           ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Other'],
  Chile:            ['Santiago', 'Valparaíso', 'Concepción', 'Antofagasta', 'Viña del Mar', 'Other'],
  China:            ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan', 'Nanjing', 'Tianjin', "Xi'an", 'Other'],
  Colombia:         ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Other'],
  'Czech Republic': ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Other'],
  Ecuador:          ['Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Other'],
  Egypt:            ['Cairo', 'Alexandria', 'Giza', 'Luxor', 'Aswan', 'Hurghada', 'Other'],
  France:           ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Bordeaux', 'Lille', 'Other'],
  Germany:          ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Other'],
  Greece:           ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Rhodes', 'Ioannina', 'Kavala', 'Katerini', 'Other'],
  Hungary:          ['Budapest', 'Debrecen', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Other'],
  Indonesia:        ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Bali', 'Yogyakarta', 'Semarang', 'Other'],
  Italy:            ['Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Bologna', 'Genoa', 'Palermo', 'Venice', 'Other'],
  Japan:            ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Sendai', 'Other'],
  Jordan:           ['Amman', 'Zarqa', 'Irbid', 'Aqaba', 'Other'],
  Kuwait:           ['Kuwait City', 'Hawalli', 'Salmiya', 'Ahmadi', 'Other'],
  Malaysia:         ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Kota Kinabalu', 'Ipoh', 'Other'],
  Mexico:           ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Cancún', 'Mérida', 'Tijuana', 'Other'],
  Morocco:          ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir', 'Meknes', 'Other'],
  Netherlands:      ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen', 'Other'],
  'New Zealand':    ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Dunedin', 'Other'],
  Peru:             ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Piura', 'Other'],
  Poland:           ['Warsaw', 'Kraków', 'Wrocław', 'Gdańsk', 'Poznań', 'Łódź', 'Katowice', 'Other'],
  Portugal:         ['Lisbon', 'Porto', 'Braga', 'Coimbra', 'Faro', 'Setúbal', 'Other'],
  Qatar:            ['Doha', 'Al Rayyan', 'Al Wakrah', 'Other'],
  Romania:          ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Brașov', 'Other'],
  Russia:           ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Ekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Other'],
  'Saudi Arabia':   ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Abha', 'Other'],
  'South Korea':    ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Gwangju', 'Daejeon', 'Suwon', 'Other'],
  Spain:            ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Málaga', 'Zaragoza', 'Murcia', 'Alicante', 'Other'],
  Sweden:           ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Other'],
  Switzerland:      ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Other'],
  Taiwan:           ['Taipei', 'Kaohsiung', 'Taichung', 'Tainan', 'Hsinchu', 'Other'],
  Thailand:         ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Chiang Rai', 'Hua Hin', 'Other'],
  Turkey:           ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep', 'Konya', 'Mersin', 'Other'],
  UAE:              ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Al Ain', 'Other'],
  Ukraine:          ['Kyiv', 'Kharkiv', 'Odessa', 'Lviv', 'Dnipro', 'Zaporizhzhia', 'Other'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Edinburgh', 'Bristol', 'Liverpool', 'Sheffield', 'Other'],
  'United States':  ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Miami', 'Boston', 'Seattle', 'Dallas', 'Other'],
  Venezuela:        ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Other'],
  Vietnam:          ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Nha Trang', 'Other'],
};
const COUNTRIES = [...Object.keys(LOCATION_DATA).sort(), 'Other'];

const SCHOOL_TYPES = [
  { value: 'language_school', label: 'Language School', emoji: '🏫' },
  { value: 'state_school',    label: 'State School',    emoji: '🏛️' },
  { value: 'university',      label: 'University',      emoji: '🎓' },
  { value: 'private_tutor',   label: 'Private Tutor',   emoji: '👤' },
];
const AGE_RANGES = [
  { value: 'young_learners', label: 'Young Learners', sub: 'Ages 6–12',  emoji: '🧒' },
  { value: 'teens',          label: 'Teens',          sub: 'Ages 13–17', emoji: '🧑' },
  { value: 'adults',         label: 'Adults',         sub: 'Ages 18+',   emoji: '👨‍💼' },
  { value: 'mixed',          label: 'Mixed',          sub: 'All ages',   emoji: '👥' },
];
const CLASS_SIZES = [
  { value: 'one_to_one', label: '1-to-1',  sub: 'Just you & student', emoji: '🤝' },
  { value: 'small',      label: 'Small',   sub: '2–8 students',       emoji: '👫' },
  { value: 'group',      label: 'Group',   sub: '9–20 students',      emoji: '👨‍👩‍👧‍👦' },
  { value: 'large',      label: 'Large',   sub: '20+ students',       emoji: '🏟️' },
];

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const SelectField: React.FC<{ value: string; onChange: (v: string) => void; options: string[]; placeholder: string }> =
  ({ value, onChange, options, placeholder }) => (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-coral transition-colors appearance-none cursor-pointer pr-10"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
    </div>
  );

const TextField: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> =
  ({ value, onChange, placeholder }) => (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-gray-50 border-2 border-coral rounded-xl text-sm font-bold text-gray-900 focus:outline-none placeholder:font-normal placeholder:text-gray-400"
    />
  );

const MultiChipGrid: React.FC<{
  options: { value: string; label: string; sub?: string; emoji: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}> = ({ options, selected, onToggle }) => (
  <div className="grid grid-cols-2 gap-2">
    {options.map(opt => {
      const active = selected.includes(opt.value);
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onToggle(opt.value)}
          className={`relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
            active ? 'border-coral bg-coral/5' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
          }`}
        >
          {active && <CheckCircle2 size={14} className="absolute top-2 right-2 text-coral" />}
          <span className="text-xl">{opt.emoji}</span>
          <div>
            <div className="text-xs font-black text-gray-900 uppercase tracking-tight">{opt.label}</div>
            {opt.sub && <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{opt.sub}</div>}
          </div>
        </button>
      );
    })}
  </div>
);

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-3xl p-8 shadow-sm border border-gray-100 ${className}`}>{children}</div>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">{icon}</div>
    <div>
      <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h3>
      {subtitle && <p className="text-[11px] text-gray-400 font-medium">{subtitle}</p>}
    </div>
  </div>
);

const RowItem: React.FC<{ label: string; sub?: string; right: React.ReactNode; danger?: boolean }> =
  ({ label, sub, right, danger }) => (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${danger ? 'border-red-100 bg-red-50/50' : 'border-gray-100 bg-gray-50'}`}>
      <div>
        <div className={`text-sm font-bold ${danger ? 'text-red-700' : 'text-gray-900'}`}>{label}</div>
        {sub && <div className="text-xs text-gray-400 font-medium mt-0.5">{sub}</div>}
      </div>
      <div>{right}</div>
    </div>
  );

// ─── Main Component ───────────────────────────────────────────────────────────
export const SettingsPage: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('profile');

  // ── Classes ────────────────────────────────────────────────────────────────
  const [classes, setClasses]         = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [classLoading, setClassLoading] = useState(false);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview]     = useState<string | null>(null);

  // ── Teaching profile ───────────────────────────────────────────────────────
  const [countrySelected, setCountrySelected] = useState('');
  const [countryCustom, setCountryCustom]     = useState('');
  const [citySelected, setCitySelected]       = useState('');
  const [cityCustom, setCityCustom]           = useState('');
  const [schoolType, setSchoolType]           = useState<string[]>([]);
  const [ageRange, setAgeRange]               = useState<string[]>([]);
  const [classSize, setClassSize]             = useState<string[]>([]);
  const [profileSaving, setProfileSaving]     = useState(false);
  const [profileDirty, setProfileDirty]       = useState(false);

  // ── Security ───────────────────────────────────────────────────────────────
  const [displayName, setDisplayName]         = useState('');
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletionLoading, setDeletionLoading] = useState(false);

  // ── Privacy ────────────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState(false);

  // Detect if the user signed in with Google
  const isGoogleUser = user?.providerData?.some(p => p.providerId === 'google.com') ?? false;
  const isEmailUser  = user?.providerData?.some(p => p.providerId === 'password') ?? false;

  // ─── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) loadClasses();
  }, [user]);

  useEffect(() => {
    if (!userProfile) return;
    setDisplayName(userProfile.displayName || '');

    const p = (userProfile as any)?.profile;
    if (!p) return;

    if (p.country && LOCATION_DATA[p.country]) {
      setCountrySelected(p.country);
    } else if (p.country) {
      setCountrySelected('Other');
      setCountryCustom(p.country);
    }
    if (p.city) {
      const cities = LOCATION_DATA[p.country] ?? [];
      if (cities.includes(p.city)) {
        setCitySelected(p.city);
      } else {
        setCitySelected('Other');
        setCityCustom(p.city);
      }
    }
    setSchoolType(p.schoolType ?? []);
    setAgeRange(p.ageRange ?? []);
    setClassSize(p.classSize ?? []);
  }, [userProfile]);

  // ─── Classes ────────────────────────────────────────────────────────────────
  const loadClasses = async () => {
    if (!user) return;
    const data = await getClassTags(user.uid);
    setClasses(data);
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !user) return;
    setClassLoading(true);
    try {
      await createClassTag(user.uid, newClassName, '2024-2025', '#EF3D5A');
      setNewClassName('');
      loadClasses();
      toast.success('Class created');
    } catch { toast.error('Failed to create class'); }
    finally { setClassLoading(false); }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Delete this class? This cannot be undone.')) return;
    try { await deleteClassTag(id); loadClasses(); toast.success('Class deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  // ─── Avatar ─────────────────────────────────────────────────────────────────
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB');     return; }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    try {
      const ref = storage.ref(`profile-pictures/${user.uid}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();

      // Update Firestore + Auth profile
      await Promise.all([
        db.collection('users').doc(user.uid).update({ photoURL: url }),
        auth.currentUser?.updateProfile({ photoURL: url }),
      ]);
      toast.success('Profile picture updated!');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed. Try again.');
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Teaching profile ────────────────────────────────────────────────────────
  const country     = countrySelected === 'Other' ? countryCustom : countrySelected;
  const cityOptions = LOCATION_DATA[countrySelected] ?? [];
  const city        = citySelected === 'Other' ? cityCustom : citySelected;
  const markDirty   = () => setProfileDirty(true);

  const toggleChip = (field: 'schoolType' | 'ageRange' | 'classSize', value: string) => {
    const map = { schoolType: setSchoolType, ageRange: setAgeRange, classSize: setClassSize };
    const cur = { schoolType, ageRange, classSize }[field];
    map[field](cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]);
    markDirty();
  };

  const handleSaveProfile = async () => {
    if (!user || !country.trim()) { toast.error('Please select a country first'); return; }
    setProfileSaving(true);
    try {
      await saveTeacherProfile(user.uid, { country, city, schoolType, ageRange, classSize });
      toast.success('Teaching profile saved!');
      setProfileDirty(false);
    } catch { toast.error('Failed to save profile'); }
    finally { setProfileSaving(false); }
  };

  // ─── Display name ────────────────────────────────────────────────────────────
  const handleSaveDisplayName = async () => {
    if (!user || !displayName.trim()) return;
    setDisplayNameSaving(true);
    try {
      await Promise.all([
        db.collection('users').doc(user.uid).update({ displayName: displayName.trim() }),
        auth.currentUser?.updateProfile({ displayName: displayName.trim() }),
      ]);
      toast.success('Name updated!');
    } catch { toast.error('Failed to update name'); }
    finally { setDisplayNameSaving(false); }
  };

  // ─── Password reset ──────────────────────────────────────────────────────────
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setPasswordResetLoading(true);
    try {
      await auth.sendPasswordResetEmail(user.email);
      setPasswordResetSent(true);
      toast.success('Password reset email sent!');
    } catch { toast.error('Failed to send reset email'); }
    finally { setPasswordResetLoading(false); }
  };

  // ─── Delete account ──────────────────────────────────────────────────────────
  const handleRequestDeletion = async () => {
    if (!user) return;
    setDeletionLoading(true);
    try {
      await db.collection('users').doc(user.uid).update({
        status: 'pending_deletion',
        deletionRequestedAt: serverTimestamp(),
      });
      toast.success('Deletion request submitted. You have 30 days to change your mind.');
      await logout();
      navigate('/login');
    } catch { toast.error('Failed to submit deletion request'); }
    finally { setDeletionLoading(false); }
  };

  // ─── Export data ─────────────────────────────────────────────────────────────
  const handleExportData = async () => {
    if (!user) return;
    setExportLoading(true);
    try {
      const [userDoc, activitiesSnap, magicLinksSnap] = await Promise.all([
        db.collection('users').doc(user.uid).get(),
        db.collection('activities').where('userId', '==', user.uid).get(),
        db.collection('magicLinks').where('userId', '==', user.uid).get(),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: userDoc.data(),
        activities: activitiesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        sessions: magicLinksSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `braid-studio-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch { toast.error('Export failed. Try again.'); }
    finally { setExportLoading(false); }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  if (!user) return null;

  const photoURL = avatarPreview || userProfile?.photoURL || null;
  const initials = (userProfile?.displayName || user.email || 'U')[0].toUpperCase();
  const lastLoginStr = userProfile?.lastLogin?.toDate
    ? userProfile.lastLogin.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Unknown';

  const SIDEBAR_TABS = [
    { id: 'profile',  label: 'My Profile',  icon: User   },
    { id: 'classes',  label: 'Classes',     icon: School },
    { id: 'security', label: 'Security',    icon: Shield },
    { id: 'privacy',  label: 'Privacy',     icon: PrivacyIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      <div className="pt-24 px-6 max-w-5xl mx-auto pb-20">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">Settings</h1>
        <p className="text-sm font-medium text-gray-500 mb-8">Manage your account, preferences, and classes</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* SIDEBAR */}
          <div className="space-y-2">
            {SIDEBAR_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  activeTab === tab.id ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-white hover:text-gray-900'
                }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 text-sm font-bold transition-colors"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="md:col-span-3 space-y-6">

            {/* ── PROFILE TAB ─────────────────────────────────────────────── */}
            {activeTab === 'profile' && (
              <>
                {/* Avatar + account info */}
                <SectionCard>
                  <div className="flex items-center gap-6">
                    {/* Avatar with upload overlay */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-black"
                        style={{ backgroundColor: userProfile?.avatarColor || '#EF3D5A' }}
                      >
                        {photoURL ? (
                          <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center border-2 border-white hover:bg-coral transition-colors shadow-md"
                        title="Change profile picture"
                      >
                        {avatarUploading
                          ? <RefreshCw size={12} className="text-white animate-spin" />
                          : <Camera size={12} className="text-white" />
                        }
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarSelect}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-gray-900 truncate">{userProfile?.displayName || 'User'}</h3>
                      <p className="text-sm text-gray-400 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 uppercase">
                          {userProfile?.role || 'Teacher'}
                        </span>
                        {isGoogleUser && (
                          <span className="px-3 py-1 bg-blue-50 rounded-lg text-xs font-bold text-blue-500 uppercase">
                            Google Account
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest">
                    JPG, PNG or GIF — max 5 MB
                  </p>
                </SectionCard>

                {/* Teaching profile */}
                <SectionCard>
                  <div className="flex items-center justify-between mb-6">
                    <SectionHeader
                      icon={<MapPin size={16} />}
                      title="Teaching Profile"
                      subtitle="Helps personalise your experience and improve insights"
                    />
                    {profileDirty && (
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse ml-4">
                        Unsaved changes
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Location */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Location</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400">Country</label>
                          <SelectField
                            value={countrySelected}
                            onChange={v => { setCountrySelected(v); setCitySelected(''); setCityCustom(''); markDirty(); }}
                            options={COUNTRIES}
                            placeholder="Select country..."
                          />
                          {countrySelected === 'Other' && (
                            <TextField value={countryCustom} onChange={v => { setCountryCustom(v); markDirty(); }} placeholder="Type your country..." />
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400">City</label>
                          {countrySelected && countrySelected !== 'Other' ? (
                            <>
                              <SelectField
                                value={citySelected}
                                onChange={v => { setCitySelected(v); markDirty(); }}
                                options={cityOptions}
                                placeholder="Select city..."
                              />
                              {citySelected === 'Other' && (
                                <TextField value={cityCustom} onChange={v => { setCityCustom(v); markDirty(); }} placeholder="Type your city..." />
                              )}
                            </>
                          ) : (
                            <TextField
                              value={cityCustom}
                              onChange={v => { setCityCustom(v); markDirty(); }}
                              placeholder={countrySelected === 'Other' ? 'Type your city...' : 'Select a country first'}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* School type */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Where do you work?</p>
                      <MultiChipGrid options={SCHOOL_TYPES} selected={schoolType} onToggle={v => toggleChip('schoolType', v)} />
                    </div>

                    {/* Age range */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Who do you teach?</p>
                      <MultiChipGrid options={AGE_RANGES} selected={ageRange} onToggle={v => toggleChip('ageRange', v)} />
                    </div>

                    {/* Class size */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Class sizes?</p>
                      <MultiChipGrid options={CLASS_SIZES} selected={classSize} onToggle={v => toggleChip('classSize', v)} />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={profileSaving || !profileDirty}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                          profileSaving || !profileDirty
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-coral text-white hover:bg-[#DC2E4A] shadow-lg shadow-coral/20 active:scale-95'
                        }`}
                      >
                        <Save size={14} />
                        {profileSaving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </div>
                </SectionCard>
              </>
            )}

            {/* ── CLASSES TAB ──────────────────────────────────────────────── */}
            {activeTab === 'classes' && (
              <SectionCard>
                <SectionHeader icon={<School size={16} />} title="My Classes" subtitle="Create and manage your class groups" />
                <div className="flex gap-4 mb-8">
                  <input
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
                    placeholder="Enter new class name..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-coral transition-colors"
                  />
                  <button
                    onClick={handleCreateClass}
                    disabled={classLoading}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={14} /> Add Class
                  </button>
                </div>
                <div className="space-y-3">
                  {classes.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm font-medium">No classes yet — create one above!</div>
                  ) : (
                    classes.map(cls => (
                      <div key={cls.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
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
              </SectionCard>
            )}

            {/* ── SECURITY TAB ─────────────────────────────────────────────── */}
            {activeTab === 'security' && (
              <div className="space-y-6">

                {/* Display name */}
                <SectionCard>
                  <SectionHeader icon={<User size={16} />} title="Display Name" subtitle="This is shown on your profile and activities" />
                  <div className="flex gap-3">
                    <input
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your display name..."
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-coral transition-colors"
                    />
                    <button
                      onClick={handleSaveDisplayName}
                      disabled={displayNameSaving || displayName.trim() === (userProfile?.displayName || '')}
                      className={`px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        displayNameSaving || displayName.trim() === (userProfile?.displayName || '')
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-black active:scale-95'
                      }`}
                    >
                      {displayNameSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                  </div>
                </SectionCard>

                {/* Password */}
                <SectionCard>
                  <SectionHeader icon={<KeyRound size={16} />} title="Password" subtitle="Manage your login credentials" />
                  <div className="space-y-3">
                    {isGoogleUser && !isEmailUser ? (
                      <RowItem
                        label="Signed in with Google"
                        sub="Your password is managed by Google — no changes needed here"
                        right={
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-3 py-1.5 bg-blue-50 rounded-lg">
                            Google SSO
                          </span>
                        }
                      />
                    ) : (
                      <RowItem
                        label="Change Password"
                        sub={passwordResetSent ? `Reset link sent to ${user.email}` : 'A reset link will be sent to your email'}
                        right={
                          <button
                            onClick={handlePasswordReset}
                            disabled={passwordResetLoading || passwordResetSent}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                              passwordResetSent
                                ? 'bg-green-50 text-green-600 cursor-default'
                                : 'bg-gray-900 text-white hover:bg-black active:scale-95'
                            }`}
                          >
                            {passwordResetLoading
                              ? <RefreshCw size={13} className="animate-spin" />
                              : passwordResetSent
                              ? <CheckCircle2 size={13} />
                              : <Mail size={13} />
                            }
                            {passwordResetSent ? 'Sent!' : 'Send Reset Email'}
                          </button>
                        }
                      />
                    )}
                  </div>
                </SectionCard>

                {/* Session info */}
                <SectionCard>
                  <SectionHeader icon={<ShieldCheck size={16} />} title="Session & Activity" />
                  <div className="space-y-3">
                    <RowItem
                      label="Last Login"
                      sub={lastLoginStr}
                      right={<span className="text-[10px] font-bold text-gray-400">Automatically logged out after 2h inactivity</span>}
                    />
                    <RowItem
                      label="Sign In Method"
                      sub={isGoogleUser ? 'Google OAuth' : 'Email & Password'}
                      right={
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500">
                          {isGoogleUser ? 'Google' : 'Email'}
                        </span>
                      }
                    />
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ── PRIVACY TAB ──────────────────────────────────────────────── */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">

                {/* What we collect */}
                <SectionCard>
                  <SectionHeader icon={<Info size={16} />} title="What We Collect" subtitle="Braid Studio is transparent about your data" />
                  <div className="space-y-3">
                    {[
                      { label: 'Account Information', sub: 'Email, display name, profile photo — needed to identify your account.' },
                      { label: 'Teaching Profile', sub: 'Country, city, school type, age range, class size — used to personalise your experience and improve book insights.' },
                      { label: 'Activities & Materials', sub: 'Content you create inside Braid Studio — stored so you can access it anytime.' },
                      { label: 'Usage Data', sub: 'AI token usage, activity sessions, and last-active timestamps — used for platform limits and analytics.' },
                      { label: 'We Never Sell Your Data', sub: 'Your information is never sold to third parties or used for advertising.' },
                    ].map(item => (
                      <div key={item.label} className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <CheckCircle2 size={16} className="text-coral flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-bold text-gray-900">{item.label}</div>
                          <div className="text-xs text-gray-500 font-medium mt-0.5">{item.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* Export data */}
                <SectionCard>
                  <SectionHeader icon={<Download size={16} />} title="Export My Data" subtitle="Download everything we have stored about your account" />
                  <RowItem
                    label="Download Your Data"
                    sub="Exports your profile, all activities, and session records as a JSON file"
                    right={
                      <button
                        onClick={handleExportData}
                        disabled={exportLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                      >
                        {exportLoading ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                        {exportLoading ? 'Exporting...' : 'Export JSON'}
                      </button>
                    }
                  />
                </SectionCard>

                {/* Legal links */}
                <SectionCard>
                  <SectionHeader icon={<FileText size={16} />} title="Legal" />
                  <div className="space-y-3">
                    <RowItem
                      label="Terms of Service"
                      sub="Read our terms and conditions"
                      right={
                        <button onClick={() => navigate('/terms')} className="flex items-center gap-1 text-[11px] font-black text-gray-500 hover:text-coral transition-colors uppercase tracking-widest">
                          View <ChevronRight size={13} />
                        </button>
                      }
                    />
                    <RowItem
                      label="Privacy Policy"
                      sub="Read how we handle your data"
                      right={
                        <button onClick={() => navigate('/privacy')} className="flex items-center gap-1 text-[11px] font-black text-gray-500 hover:text-coral transition-colors uppercase tracking-widest">
                          View <ChevronRight size={13} />
                        </button>
                      }
                    />
                  </div>
                </SectionCard>

                {/* Delete account */}
                <SectionCard>
                  <SectionHeader icon={<AlertTriangle size={16} className="text-red-500" />} title="Danger Zone" subtitle="Irreversible actions — read carefully before proceeding" />

                  {!showDeleteConfirm ? (
                    <RowItem
                      label="Request Account Deletion"
                      sub="Your account will enter a 30-day grace period. You can cancel any time before it expires."
                      danger
                      right={
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95"
                        >
                          <Trash size={13} /> Delete Account
                        </button>
                      }
                    />
                  ) : (
                    <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl space-y-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-black text-red-700">Are you absolutely sure?</p>
                          <p className="text-xs text-red-500 font-medium mt-1">
                            Type <span className="font-black">DELETE</span> to confirm. Your account will be scheduled for permanent removal after 30 days.
                          </p>
                        </div>
                      </div>
                      <input
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        placeholder='Type "DELETE" to confirm...'
                        className="w-full px-4 py-3 bg-white border-2 border-red-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-red-500 placeholder:font-normal placeholder:text-gray-400"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                          className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRequestDeletion}
                          disabled={deleteConfirmText !== 'DELETE' || deletionLoading}
                          className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                            deleteConfirmText === 'DELETE' && !deletionLoading
                              ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95'
                              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          {deletionLoading ? <RefreshCw size={13} className="animate-spin" /> : <Trash size={13} />}
                          {deletionLoading ? 'Processing...' : 'Confirm Deletion'}
                        </button>
                      </div>
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

