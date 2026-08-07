import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { SourcePanel } from './panels/SourcePanel';
import { WorkbenchPanel } from './panels/WorkbenchPanel';
import { PartnerPanel } from './panels/PartnerPanel';
import { useStudio } from '../context/StudioContext';
import { Archive, ClipboardCheck, MessageSquare } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'source' | 'workbench' | 'partner'>('workbench');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const location = useLocation();
  const { workbench, sources } = useStudio();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for mobileTab state from navigation (e.g. from "Upload New" buttons)
  useEffect(() => {
    const state = location.state as { mobileTab?: 'source' | 'workbench' | 'partner' } | null;
    if (state?.mobileTab) {
      setActiveTab(state.mobileTab);
      // Clean up state to prevent stuck tabs on refresh or subsequent interactions
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Determine Layout Strategy based on width
  const isLargeMonitor = windowWidth >= 1920;
  const isStandardLaptop = windowWidth >= 1280 && windowWidth < 1920;
  const isSmallLaptop = windowWidth >= 768 && windowWidth < 1280;
  const isMobile = windowWidth < 768;

  // Edit Mode Detection: Active workbench item is saved (not 'w-') and no new sources uploaded
  const isEditingDraft = workbench.length > 0 && !workbench[0].id.startsWith('w-') && sources.length === 0;

  // Define Widths
  const getWidths = () => {
    if (isEditingDraft) {
       return { source: '0%', workbench: '60%', partner: '40%' };
    }
    if (isLargeMonitor) return { source: '35%', workbench: '35%', partner: '30%' };
    if (isStandardLaptop) return { source: '30%', workbench: '40%', partner: '30%' };
    return { source: '100%', workbench: '60%', partner: '40%' };
  };

  const widths = getWidths();

  return (
    <div className="h-screen flex flex-col bg-light-gray overflow-hidden selection:bg-coral/10">
      <Header />
      
      {/* Desktop & Laptop Viewports */}
      {!isMobile && (
        <main className={`flex-1 overflow-hidden pt-16 flex ${isSmallLaptop && !isEditingDraft ? 'flex-col' : 'flex-row'}`}>
          
          {/* Small Laptop: Stacked Layout (Only if NOT editing draft) */}
          {isSmallLaptop && !isEditingDraft ? (
            <>
              <section className="h-[200px] border-b border-gray-200 bg-white shrink-0 overflow-hidden">
                <SourcePanel layout="horizontal" />
              </section>
              <div className="flex-1 flex overflow-hidden">
                <section style={{ width: widths.workbench }} className="h-full border-r border-gray-200 overflow-hidden flex-grow">
                  <WorkbenchPanel />
                </section>
                <section style={{ width: widths.partner }} className="h-full overflow-hidden shrink-0">
                  <PartnerPanel />
                </section>
              </div>
            </>
          ) : (
            /* Standard/Large OR Small Laptop in Edit Mode (Side-by-Side) */
            <>
              {!isEditingDraft && (
                <section 
                  style={{ width: widths.source }} 
                  className="h-full border-r border-gray-200 transition-all duration-500 ease-in-out overflow-hidden flex-shrink-0"
                >
                  <SourcePanel />
                </section>
              )}
              
              <section 
                style={{ width: widths.workbench }} 
                className={`h-full border-r border-gray-200 transition-all duration-500 ease-in-out overflow-hidden ${isEditingDraft ? 'flex-1' : 'flex-grow'}`}
              >
                <WorkbenchPanel />
              </section>
              
              <section 
                style={{ width: widths.partner }} 
                className="h-full transition-all duration-500 ease-in-out overflow-hidden flex-shrink-0"
              >
                <PartnerPanel />
              </section>
            </>
          )}
        </main>
      )}

      {/* Mobile Tabbed Viewport */}
      {isMobile && (
        <main className="flex-1 overflow-hidden flex flex-col pt-16">
          <div className="flex-1 overflow-hidden relative">
            <div className={`absolute inset-0 transition-transform duration-300 ${activeTab === 'source' ? 'translate-x-0' : '-translate-x-full'}`}>
              <SourcePanel />
            </div>
            <div className={`absolute inset-0 transition-transform duration-300 ${activeTab === 'workbench' ? 'translate-x-0' : (activeTab === 'source' ? 'translate-x-full' : '-translate-x-full')}`}>
              <WorkbenchPanel />
            </div>
            <div className={`absolute inset-0 transition-transform duration-300 ${activeTab === 'partner' ? 'translate-x-0' : 'translate-x-full'}`}>
              <PartnerPanel />
            </div>
          </div>

          <nav className="h-16 bg-white border-t border-gray-100 flex items-stretch shrink-0 pb-[env(safe-area-inset-bottom)]">
            {!isEditingDraft && (
              <button
                onClick={() => setActiveTab('source')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'source' ? 'text-coral' : 'text-gray-300'}`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'source' ? 'bg-coral/5' : ''}`}>
                  <Archive className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">Source</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('workbench')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'workbench' ? 'text-coral' : 'text-gray-300'}`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'workbench' ? 'bg-coral/5' : ''}`}>
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">Workbench</span>
            </button>
            <button
              onClick={() => setActiveTab('partner')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'partner' ? 'text-coral' : 'text-gray-300'}`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'partner' ? 'bg-coral/5' : ''}`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">Partner</span>
            </button>
          </nav>
        </main>
      )}
    </div>
  );
};
