import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { BraidAnimation } from '../components/BraidAnimation';
import { 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Zap, 
  Globe, 
  BookOpen,
  MousePointer2,
  BrainCircuit
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) navigate('/app');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden selection:bg-coral/10">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 flex items-center justify-between px-6 md:px-12">
        <Logo size="sm" layout="horizontal" />
        <div className="flex items-center gap-6">
          {!user ? (
            <>
              <button onClick={() => navigate('/login')} className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-coral transition-colors">Log In</button>
              <button onClick={() => navigate('/signup')} className="px-6 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-black transition-all active:scale-95">Start Studio</button>
            </>
          ) : (
            <button onClick={() => navigate('/app')} className="px-6 py-3 bg-coral text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-coral/20 hover:bg-[#DC2E4A] transition-all active:scale-95 flex items-center gap-2">
              Go to Workspace <ArrowRight size={14} />
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-16 relative z-10">
          <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-coral/5 text-coral rounded-full border border-coral/10">
              <Sparkles size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Crafting Education's Future</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tighter uppercase">
              Weave <span className="text-coral">Intuition</span><br/>With <span className="text-indigo-600">Intelligence</span>.
            </h1>
            
            <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed max-w-lg">
              BraidStudio is the world's first Loom for Learning. We weave teacher pedagogy with high-fidelity AI to create bespoke, high-impact educational materials in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button onClick={handleCTA} className="w-full sm:w-auto px-10 py-5 bg-gray-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3">
                Open the Studio <ArrowRight size={20} />
              </button>
              <button onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })} className="w-full sm:w-auto px-10 py-5 bg-white border border-gray-200 text-gray-400 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:text-gray-900 hover:border-gray-300 transition-all flex items-center justify-center gap-3">
                How it Weaves
              </button>
            </div>
          </div>

          <div className="relative h-[300px] md:h-[500px] animate-in fade-in zoom-in duration-1000">
             <BraidAnimation className="absolute inset-0" />
             {/* Floating Pedagogy Cards */}
             <div className="absolute top-1/4 right-0 bg-white p-5 rounded-2xl shadow-2xl border border-gray-100 animate-float">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><Layers size={18} /></div>
                   <div>
                     <p className="text-[10px] font-black uppercase text-gray-900 leading-none">Pedagogical Guardrails</p>
                     <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Contextual Integrity</p>
                   </div>
                </div>
             </div>
             <div className="absolute bottom-1/4 left-0 bg-white p-5 rounded-2xl shadow-2xl border border-gray-100 animate-float-delayed">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-coral/10 text-coral rounded-lg flex items-center justify-center"><BrainCircuit size={18} /></div>
                   <div>
                     <p className="text-[10px] font-black uppercase text-gray-900 leading-none">Drafting Partner</p>
                     <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Generative Precision</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Ambient Atmosphere */}
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[800px] h-[800px] bg-coral/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      </section>

      {/* The Weaving Process */}
      <section className="py-24 bg-gray-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-[11px] font-black text-coral uppercase tracking-[0.4em]">The Architecture of a Braid</h2>
            <p className="text-4xl font-black uppercase tracking-tight text-gray-900">Education Redefined in Three Strands</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<Globe size={28} />}
              title="Global Source Reading"
              desc="Upload any coursebook, worksheet, or article. Our engine extracts the pedagogical DNA: vocabulary, grammar, and core themes."
              color="blue"
            />
            <FeatureCard 
              icon={<MousePointer2 size={28} />}
              title="Intuitive Braiding"
              desc="Guide the AI with your professional intuition. Refine drafts, adjust difficulty, and weave in your unique teaching style."
              color="coral"
            />
            <FeatureCard 
              icon={<BookOpen size={28} />}
              title="Seamless Delivery"
              desc="Produce high-fidelity PDF handouts or create interactive Digital Magic Links for immediate classroom engagement."
              color="emerald"
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-gray-900 rounded-[64px] p-12 md:p-32 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <BraidAnimation />
          </div>
          <div className="relative z-10 space-y-12">
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-tight">
              Don't just prompt.<br/><span className="text-coral">Braid.</span>
            </h2>
            <p className="text-xl text-gray-400 font-medium max-w-xl mx-auto leading-relaxed">
              Step into the studio where every lesson is a masterpiece of human intuition and artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button onClick={handleCTA} className="w-full sm:w-auto px-16 py-6 bg-white text-gray-900 rounded-[32px] font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all shadow-2xl active:scale-95">
                Join the Studio
              </button>
              <button onClick={() => navigate('/signup')} className="w-full sm:w-auto px-16 py-6 bg-gray-800 text-white rounded-[32px] font-black text-sm uppercase tracking-widest hover:bg-gray-700 transition-all border border-white/10 active:scale-95">
                Request Access
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-16 border-t border-gray-100 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <Logo size="sm" layout="horizontal" />
          <div className="flex items-center gap-10 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <a href="#" className="hover:text-coral transition-colors">Privacy Codex</a>
            <a href="#" className="hover:text-coral transition-colors">Terms of Service</a>
            <a href="mailto:info@braidstudio.getadaptiv.com" className="hover:text-coral transition-colors">Partner Support</a>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
            © 2025 ADAPTIV PERSONALIZED LEARNING
          </p>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(20px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
      `}} />
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, color }: any) => {
  const styles: any = {
    blue: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    coral: 'bg-coral/5 text-coral border-coral/10',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };

  return (
    <div className="bg-white p-12 rounded-[48px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col items-center text-center">
      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-10 transition-all group-hover:scale-110 group-hover:rotate-3 ${styles[color]}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black uppercase text-gray-900 mb-6 tracking-tight leading-none">{title}</h3>
      <p className="text-gray-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
};
