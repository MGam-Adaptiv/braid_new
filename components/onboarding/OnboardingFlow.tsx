import React, { useState } from 'react';
import { saveTeacherProfile } from '../../services/userService';
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

export interface TeacherProfile {
  country: string;
  city: string;
  schoolType: string[];
  ageRange: string[];
  classSize: string[];
}

interface Props {
  userId: string;
  userName: string | null;
  onComplete: () => void;
}

// ─── Hardcoded country → city data ───────────────────────────────────────────
const LOCATION_DATA: Record<string, string[]> = {
  Argentina:        ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Tucumán', 'Mar del Plata', 'Other'],
  Australia:        ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Other'],
  Austria:          ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Other'],
  Brazil:           ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Curitiba', 'Recife', 'Other'],
  Canada:           ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Other'],
  Chile:            ['Santiago', 'Valparaíso', 'Concepción', 'Antofagasta', 'Viña del Mar', 'Other'],
  China:            ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan', 'Nanjing', 'Tianjin', 'Xi\'an', 'Other'],
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

// ─── Chip options ─────────────────────────────────────────────────────────────
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

const STEPS = ['Location', 'School type', 'Students', 'Class size'];

// ─── Multi-select chip grid ───────────────────────────────────────────────────
const MultiChipGrid: React.FC<{
  options: { value: string; label: string; sub?: string; emoji: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}> = ({ options, selected, onToggle }) => (
  <div className="grid grid-cols-2 gap-3">
    {options.map(opt => {
      const active = selected.includes(opt.value);
      return (
        <button
          key={opt.value}
          onClick={() => onToggle(opt.value)}
          className={`relative flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all ${
            active ? 'border-coral bg-coral/5 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          {active && <CheckCircle2 size={16} className="absolute top-3 right-3 text-coral" />}
          <span className="text-2xl mb-2">{opt.emoji}</span>
          <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{opt.label}</span>
          {opt.sub && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{opt.sub}</span>}
        </button>
      );
    })}
  </div>
);

// ─── Dropdown with chevron ────────────────────────────────────────────────────
const SelectField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}> = ({ value, onChange, options, placeholder }) => (
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

// ─── Text input ───────────────────────────────────────────────────────────────
const TextField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <input
    type="text"
    autoFocus
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full px-4 py-3 bg-gray-50 border-2 border-coral rounded-xl text-sm font-bold text-gray-900 focus:outline-none placeholder:font-normal placeholder:text-gray-400"
  />
);

// ─── Main component ───────────────────────────────────────────────────────────
export const OnboardingFlow: React.FC<Props> = ({ userId, userName, onComplete }) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Separate "selected" value from "custom typed" value for country + city
  const [countrySelected, setCountrySelected] = useState('');
  const [countryCustom, setCountryCustom]     = useState('');
  const [citySelected, setCitySelected]       = useState('');
  const [cityCustom, setCityCustom]           = useState('');

  const [profile, setProfile] = useState<Omit<TeacherProfile, 'country' | 'city'>>({
    schoolType: [],
    ageRange:   [],
    classSize:  [],
  });

  const firstName = userName?.split(' ')[0] || 'there';

  // Resolve final country string
  const country = countrySelected === 'Other' ? countryCustom : countrySelected;

  // City options for selected country
  const cityOptions = LOCATION_DATA[countrySelected] ?? [];

  // Resolve final city string
  const city = citySelected === 'Other' ? cityCustom : citySelected;

  const toggle = (field: 'schoolType' | 'ageRange' | 'classSize', value: string) => {
    setProfile(p => ({
      ...p,
      [field]: p[field].includes(value) ? p[field].filter(v => v !== value) : [...p[field], value],
    }));
  };

  const canAdvance = () => {
    if (step === 0) return country.trim() !== '';
    if (step === 1) return profile.schoolType.length > 0;
    if (step === 2) return profile.ageRange.length > 0;
    if (step === 3) return profile.classSize.length > 0;
    return false;
  };

  const handleNext = async () => {
    if (step < 3) { setStep(s => s + 1); }
    else { await handleFinish(); }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await saveTeacherProfile(userId, { ...profile, country, city });
      onComplete();
    } catch (e) {
      console.error('Failed to save profile:', e);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  // Skip just closes — no Firestore write, so card reappears next login
  const handleSkip = () => onComplete();

  const headings = [
    { title: `Hey ${firstName} 👋`, sub: 'Tell us where you teach' },
    { title: 'Where do you work?',  sub: 'Select all that apply' },
    { title: 'Who do you teach?',   sub: 'Select all that apply' },
    { title: 'Class sizes?',        sub: 'Select all that apply' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[28px] w-full max-w-md shadow-2xl overflow-hidden">

        {/* Top bar */}
        <div className="bg-gray-900 px-6 pt-6 pb-5">
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-coral' : i < step ? 'w-3 bg-coral/40' : 'w-3 bg-white/20'
              }`} />
            ))}
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-coral mb-1">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
          <h2 className="text-xl font-black text-white uppercase leading-tight">{headings[step].title}</h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{headings[step].sub}</p>
        </div>

        {/* Step content */}
        <div className="p-6">

          {/* Step 1 — Country + City */}
          {step === 0 && (
            <div className="space-y-4">

              {/* Country */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Country</label>
                <SelectField
                  value={countrySelected}
                  onChange={v => { setCountrySelected(v); setCitySelected(''); setCityCustom(''); }}
                  options={COUNTRIES}
                  placeholder="Select a country..."
                />
                {countrySelected === 'Other' && (
                  <div className="mt-2">
                    <TextField
                      value={countryCustom}
                      onChange={setCountryCustom}
                      placeholder="Type your country..."
                    />
                  </div>
                )}
              </div>

              {/* City — only shown once a real country is chosen */}
              {countrySelected && countrySelected !== 'Other' && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    City <span className="text-gray-300 normal-case tracking-normal font-bold">(optional)</span>
                  </label>
                  {cityOptions.length > 0 ? (
                    <>
                      <SelectField
                        value={citySelected}
                        onChange={setCitySelected}
                        options={cityOptions}
                        placeholder="Select a city..."
                      />
                      {citySelected === 'Other' && (
                        <div className="mt-2">
                          <TextField
                            value={cityCustom}
                            onChange={setCityCustom}
                            placeholder="Type your city..."
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <TextField value={citySelected} onChange={setCitySelected} placeholder="Type your city..." />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — School type */}
          {step === 1 && (
            <MultiChipGrid options={SCHOOL_TYPES} selected={profile.schoolType} onToggle={v => toggle('schoolType', v)} />
          )}

          {/* Step 3 — Age range */}
          {step === 2 && (
            <MultiChipGrid options={AGE_RANGES} selected={profile.ageRange} onToggle={v => toggle('ageRange', v)} />
          )}

          {/* Step 4 — Class size */}
          {step === 3 && (
            <MultiChipGrid options={CLASS_SIZES} selected={profile.classSize} onToggle={v => toggle('classSize', v)} />
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <div>
              {step > 0 ? (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronLeft size={14} /> Back
                </button>
              ) : (
                <button
                  onClick={handleSkip}
                  className="text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-500 transition-colors"
                >
                  Skip for now
                </button>
              )}
            </div>
            <button
              onClick={handleNext}
              disabled={!canAdvance() || saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                canAdvance() && !saving
                  ? 'bg-coral text-white hover:bg-[#DC2E4A] shadow-lg shadow-coral/20 active:scale-95'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : step === 3 ? 'Done' : 'Continue'}
              {!saving && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


