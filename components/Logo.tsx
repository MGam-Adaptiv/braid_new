import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  layout = 'vertical',
  showTagline = false
}) => {
  // Actual pixel sizes
  const sizes = {
    sm: { icon: 28, text: '1.125rem', gap: 'gap-2.5', padding: 'p-1.5', radius: 'rounded-lg' },
    md: { icon: 80, text: '2.5rem', gap: 'gap-3', padding: 'p-4', radius: 'rounded-2xl' },
    lg: { icon: 120, text: '4rem', gap: 'gap-4', padding: 'p-6', radius: 'rounded-3xl' },
  };
  
  const s = sizes[size];
  const isVertical = layout === 'vertical';
  
  return (
    <div className={`flex ${isVertical ? 'flex-col items-center text-center' : 'items-center'} ${s.gap} ${className}`}>
      {/* Brand Icon */}
      <div className={`bg-black ${s.padding} ${s.radius} shadow-lg flex items-center justify-center shrink-0`}>
        <svg 
          width={s.icon} 
          height={s.icon} 
          viewBox="370 120 840 1250" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            fill="#EF3D5A" 
            d="M412.618652,700.486511 C487.530121,876.892456 660.440125,953.506836 788.373169,947.960266 C788.373169,916.817200 788.373169,885.614380 788.373169,854.553589 C822.914001,850.177490 870.833130,879.396484 881.700195,928.398865 C892.593872,977.521057 861.927490,1027.644653 812.739136,1040.887451 C788.845093,1047.320312 765.601990,1044.645630 743.985168,1033.077026 C714.798157,1017.456970 698.494446,992.149109 693.100647,959.539917 C588.733521,959.539917 484.931946,959.539917 381.117981,959.539917 C385.514526,1182.245239 576.546997,1375.122192 823.223633,1354.896240 C1051.713013,1336.161621 1227.356079,1129.196289 1191.355835,887.576294 C1157.793335,662.318176 957.372986,535.416809 787.619507,542.041321 C787.619507,573.189819 787.619507,604.393616 787.619507,635.407898 C750.127380,642.025330 702.884766,603.535767 694.491699,560.171143 C684.538025,508.743439 717.663635,459.703064 767.218750,448.256042 C816.475037,436.878021 873.016785,467.121246 883.581116,530.488586 C987.266663,530.488586 1091.061890,530.488586 1195.682007,530.488586 C1195.682007,526.196533 1196.023560,522.547180 1195.623901,518.980896 C1193.705811,501.863129 1192.574463,484.580841 1189.375488,467.695740 C1172.016968,376.072662 1128.891724,298.523560 1059.218018,236.525543 C992.000244,176.712952 912.945984,142.803329 823.293152,135.087280 C764.244751,130.005234 706.474731,137.281799 650.454529,157.513260 C581.238464,182.510315 522.634277,222.862076 475.801849,279.441864 C407.132721,362.403259 375.562805,457.887024 381.541870,565.761780 C384.107758,612.055786 394.367828,656.356140 412.618652,700.486511" 
          />
        </svg>
      </div>
      
      {/* Brand Text */}
      <div className={`flex items-baseline ${isVertical ? 'justify-center' : ''}`}>
        <span 
          className="font-bold tracking-tight text-black leading-none"
          style={{ fontSize: s.text }}
        >
          BRAID
        </span>
        <span 
          className="font-bold tracking-tight leading-none ml-1.5"
          style={{ fontSize: s.text, color: '#EF3D5A' }}
        >
          STUDIO
        </span>
      </div>
      
      {/* Optional Tagline */}
      {showTagline && (
        <p className="text-[#6B7280] italic text-sm mt-1 font-normal">
          Braiding Teacher Creativity with AI
        </p>
      )}
    </div>
  );
};

export default Logo;
