import React, { useState } from 'react';
import { saveTeacherProfile } from '../../services/userService';
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

export interface TeacherProfile {
  country: string;
  schoolType: string;
  ageRange: string;
  classSize: string;
}

interface Props {
  userId: string;
  userName: string | null;
  onComplete: () => void;
}

const COUNTRIES = [
  'Argentina', 'Australia', 'Austria', 'Brazil', 'Canada', 'Chile', 'China',
  'Colombia', 'Czech Republic', 'Ecuador', 'Egypt', 'France', 'Germany', 'Greece',
  'Hungary', 'Indonesia', 'Italy', 'Japan', 'Jordan', 'Kuwait', 'Malaysia',
  'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Peru', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'South Korea', 'Spain', 'Sweden',
  'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'UAE', 'Ukraine', 'United Kingdom',
  'United States', 'Venezuela', 'Vietnam', 'Other',
];

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
  { value: 'one_to_one', label: '1-to-1',      sub: 'Just you & student', emoji: '🤝' },
  { value: 'small',      label: 'Small',        sub: '2–8 students',       emoji: '👫' },
  { value: 'group',      label: 'Group',        sub: '9–20 students',      emoji: '👨‍👩‍👧‍👦' },
  { value: 'large',      label: 'Large',        sub: '20+ students',       emoji: '🏟️' },
];

const STEPS = ['Country', 'School type', 'Students', 'Class size'];

const ChipGrid: React.FC<{
  options: { value: string; label: string; sub?: string; emoji: string }[];
  selected: string;
  onSelect: (v: string) => void;
}> = ({ options, selected, onSelect }) => (
  <div className="grid grid-cols-2 gap-3">
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onSelect(opt.value)}
        className={`relative flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all ${
          selected === opt.value
            ? 'border-coral bg-coral/5 shadow-sm'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        {selected === opt.value && (
          <CheckCircle2 size={16} className="absolute top-3 right-3 text-coral" />
        )}
        <span className="text-2xl mb-2">{opt.emoji}</span>
        <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{opt.label}</span>
        {opt.sub && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{opt.sub}</span>}
      </button>
    ))}
  </div>
);

export const OnboardingFlow: React.FC<Props> = ({ userId, userName, onComplete }) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile>({
    country: '',
    schoolType: '',
    ageRange: '',
    classSize: '',
  });

  const firstName = userName?.split(' ')[0] || 'there';

  const canAdvance = () => {
    if (step === 0) return profile.country !== '';
    if (step === 1) return profile.schoolType !== '';
    if (step === 2) return profile.ageRange !== '';
    if (step === 3) return profile.classSize !== '';
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
      // Still let them in — don't block on a network error
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    // Save partial profile so the overlay doesn't re-appear
    setSaving(true);
    try {
      await saveTeacherProfile(userId, { ...profile, skipped: true } as any);
    } catch (_) {}
    setSaving(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[28px] w-full max-w-md shadow-2xl overflow-hidden">

        {/* Top bar */}
        <div className="bg-gray-900 px-6 pt-6 pb-5">
          {/* Progress dots */}
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

          {/* Step label */}
          <p className="text-[9px] font-black uppercase tracking-widest text-coral mb-1">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>

          {/* Heading */}
          {step === 0 && (
            <>
              <h2 className="text-xl font-black text-white uppercase leading-tight">
                Hey {firstName} 👋
              </h2>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Tell us where you teach
              </p>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-xl font-black text-white uppercase leading-tight">
                Where do you work?
              </h2>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Select your school type
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-black text-white uppercase leading-tight">
                Who do you teach?
              </h2>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Your students' age range
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="text-xl font-black text-white uppercase leading-tight">
                How big are your classes?
              </h2>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Typical class size
              </p>
            </>
          )}
        </div>

        {/* Step content */}
        <div className="p-6">
          {step === 0 && (
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                Country
              </label>
              <select
                value={profile.country}
                onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-coral transition-colors appearance-none cursor-pointer"
              >
                <option value="">Select a country...</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {step === 1 && (
            <ChipGrid
              options={SCHOOL_TYPES}
              selected={profile.schoolType}
              onSelect={v => setProfile(p => ({ ...p, schoolType: v }))}
            />
          )}

          {step === 2 && (
            <ChipGrid
              options={AGE_RANGES}
              selected={profile.ageRange}
              onSelect={v => setProfile(p => ({ ...p, ageRange: v }))}
            />
          )}

          {step === 3 && (
            <ChipGrid
              options={CLASS_SIZES}
              selected={profile.classSize}
              onSelect={v => setProfile(p => ({ ...p, classSize: v }))}
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
