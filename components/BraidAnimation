import React from 'react';

export const BraidAnimation: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 800 400"
        className="w-full h-full max-w-5xl drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="teacherGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF3D5A" />
            <stop offset="50%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#EF3D5A" />
          </linearGradient>
          <filter id="strandGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Strand 1: Teacher Intuition (Deep Indigo/Blue) */}
        <path
          d="M-50,200 Q150,50 350,200 T750,200"
          fill="none"
          stroke="url(#teacherGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          className="animate-braid-slow opacity-60"
          filter="url(#strandGlow)"
        />

        {/* Strand 2: AI Drafting Partner (Vibrant Coral) */}
        <path
          d="M-50,200 Q150,350 350,200 T750,200"
          fill="none"
          stroke="url(#aiGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          className="animate-braid-fast opacity-60"
          filter="url(#strandGlow)"
        />

        {/* Core Weave Pulses */}
        <g className="animate-pulse-subtle">
          <circle cx="150" cy="200" r="6" fill="white" className="opacity-80" />
          <circle cx="350" cy="200" r="8" fill="white" />
          <circle cx="550" cy="200" r="6" fill="white" className="opacity-80" />
        </g>
      </svg>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes braid-move {
          0% { stroke-dashoffset: 2000; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes braid-move-reverse {
          0% { stroke-dashoffset: -2000; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse-weave {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        .animate-braid-slow {
          stroke-dasharray: 1000;
          animation: braid-move 12s linear infinite;
        }
        .animate-braid-fast {
          stroke-dasharray: 1000;
          animation: braid-move-reverse 8s linear infinite;
        }
        .animate-pulse-subtle {
          animation: pulse-weave 4s ease-in-out infinite;
          transform-origin: center;
        }
      `}} />
    </div>
  );
};
