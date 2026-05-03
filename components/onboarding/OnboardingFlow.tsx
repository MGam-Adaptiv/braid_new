import React, { useState, useEffect } from 'react';
import { saveTeacherProfile } from '../../services/userService';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

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
            active
              ? 'border-coral bg-coral/5 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          {active && (
            <CheckCircle2 size={16} className="absolute top-3 right-3 text-coral" />
          )}
          <span className="text-2xl mb-2">{opt.emoji}</span>
          <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{opt.label}</span>
          {opt.sub && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{opt.sub}</span>
          )}
        </button>
      );
    })}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const OnboardingFlow: React.FC<Props> = ({ userId, userName, onComplete }) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile>({
    country: '',
    city: '',
    schoolType: [],
    ageRange: [],
    classSize: [],
  });

  // API state — one fetch gets countries + cities together
  const [countryMap, setCountryMap] = useState<Record<string, string[]>>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  const firstName = userName?.split(' ')[0] || 'there';

  // Single fetch on mount — countries endpoint includes city arrays
  useEffect(() => {
    fetch('https://countriesnow.space/api/v0.1/countries')
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string[]> = {};
        const names: string[] = [];
        for (const entry of data.data) {
          if (!entry.country) continue;
          names.push(entry.country);
          const sorted = [...(entry.cities ?? [])].sort();
          if (sorted.length) sorted.push('Other');
          map[entry.country] = sorted;
        }
        names.sort();
        setCountries(names);
        setCountryMap(map);
      })
      .catch(() => {
        // Fallback country list if API is unreachable
        setCountries([
          'Argentina', 'Australia', 'Brazil', 'Canada', 'China', 'Colombia',
          'Egypt', 'France', 'Germany', 'Greece', 'Indonesia', 'Italy',
          'Japan', 'Mexico', 'Morocco', 'Netherlands', 'Poland', 'Portugal',
          'Romania', 'Russia', 'Saudi Arabia', 'South Korea', 'Spain',
          'Taiwan', 'Thailand', 'Turkey', 'UAE', 'Ukraine',
          'United Kingdom', 'United States', 'Vietnam', 'Other',
        ]);
      })
      .finally(() => setLoadingCountries(false));
  }, []);

  // Derive city list from map whenever country changes
  const cities = profile.country ? (countryMap[profile.country] ?? []) : [];

  const toggle = (field: 'schoolType' | 'ageRange' | 'classSize', value: string) => {
    setProfile(p => {
      const current = p[field];
      return {
        ...p,
        [field]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
  };

  const canAdvance = () => {
    if (step === 0) return profile.country !== '' && !loadingCountries;
    if (step === 1) return profile.schoolType.length > 0;
    if (step === 2) return profile.ageRange.length > 0;
    if (step === 3) return profile.classSize.length > 0;
    return false;
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      await handleFinish();
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await saveTeacherProfile(userId, profile);
      onComplete();
    } catch (e) {
      console.error('Failed to save profile:', e);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await saveTeacherProfile(userId, { ...profile, skipped: true } as any);
    } catch (_) {}
    setSaving(false);
    onComplete();
  };

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
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-coral' : i < step ? 'w-3 bg-coral/40' : 'w-3 bg-white/20'
                }`}
              />
            ))}
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-coral mb-1">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
          <h2 className="text-xl font-black text-white uppercase leading-tight">
            {headings[step].title}
          </h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {headings[step].sub}
          </p>
        </div>

        {/* Step content */}
        <div className="p-6">

          {/* Step 1 — Country + City */}
          {step === 0 && (
            <div className="space-y-4">

              {/* Country */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Country
                </label>
                {loadingCountries ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <Loader2 size={14} className="animate-spin text-gray-400" />
                    <span className="text-sm text-gray-400 font-bold">Loading countries...</span>
                  </div>
                ) : (
                  <select
                    value={profile.country}
                    onChange={e => setProfile(p => ({ ...p, country: e.target.value, city: '' }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-coral transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Select a country...</option>
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* City — shown once country is picked */}
              {profile.country && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    City <span className="text-gray-300 normal-case tracking-normal font-bold">(optional)</span>
                  </label>

                  {cities.length > 0 ? (
                    <>
                      <select
                        value={profile.city}
                        onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-coral transition-colors appearance-none cursor-pointer"
                      >
                        <option value="">Select a city...</option>
                        {cities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>

                      {/* Free-text input when "Other" city is selected */}
                      {profile.city === 'Other' && (
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type your city..."
                          onChange={e => setProfile(p => ({ ...p, city: e.target.value || 'Other' }))}
                          className="mt-3 w-full px-4 py-3 bg-gray-50 border-2 border-coral rounded-xl text-sm font-bold text-gray-900 focus:outline-none placeholder:font-normal placeholder:text-gray-400"
                        />
                      )}
                    </>
                  ) : (
                    // No city data for this country — free text fallback
                    <input
                      type="text"
                      autoFocus
                      value={profile.city}
                      onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                      placeholder="Type your city..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-coral transition-colors placeholder:font-normal placeholder:text-gray-400"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — School type */}
          {step === 1 && (
            <MultiChipGrid
              options={SCHOOL_TYPES}
              selected={profile.schoolType}
              onToggle={v => toggle('schoolType', v)}
            />
          )}

          {/* Step 3 — Age range */}
          {step === 2 && (
            <MultiChipGrid
              options={AGE_RANGES}
              selected={profile.ageRange}
              onToggle={v => toggle('ageRange', v)}
            />
          )}

          {/* Step 4 — Class size */}
          {step === 3 && (
            <MultiChipGrid
              options={CLASS_SIZES}
              selected={profile.classSize}
              onToggle={v => toggle('classSize', v)}
            />
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
                  disabled={saving}
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


