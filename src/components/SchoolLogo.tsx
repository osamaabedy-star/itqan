import React from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: number; // width and height of the icon part or entire container if specified
  showText?: boolean; // whether to show "مدارس رياض الإبداع" and "Riyadh Al Ebdaa Schools"
  variant?: 'light' | 'dark'; // for text contrasting
  imageUrl?: string; // School logo URL from Firestore settings
}

export function SchoolLogo({ className = '', size = 80, showText = true, variant = 'light', imageUrl }: SchoolLogoProps) {
  const [imgError, setImgError] = React.useState(false);

  // We use 31 rays fanning out symmetrically to form the exact domed sunburst
  const raysCount = 31;
  const startAngle = -168;
  const endAngle = -12;
  const cx = 100;
  const cy = 125;

  const sunRays = [];
  for (let i = 0; i < raysCount; i++) {
    const angle = startAngle + (i * (endAngle - startAngle)) / (raysCount - 1);
    const rad = (angle * Math.PI) / 180;
    
    // Normalized position from 0 to 1 for the dome curve (bell curve shape via sine)
    const normalizedIndex = i / (raysCount - 1);
    const curveFactor = Math.sin(normalizedIndex * Math.PI);
    
    // Calculate dynamic length to form the perfect arched dome
    const rStart = 18;
    const rEnd = 18 + (32 + 35 * curveFactor); // central rays are longer, side rays are shorter

    const x1 = cx + rStart * Math.cos(rad);
    const y1 = cy + rStart * Math.sin(rad);
    const x2 = cx + rEnd * Math.cos(rad);
    const y2 = cy + rEnd * Math.sin(rad);

    sunRays.push({ x1, y1, x2, y2 });
  }

  const textColor = variant === 'light' ? 'text-slate-800' : 'text-white';
  const subtitleColor = variant === 'light' ? 'text-amber-600' : 'text-amber-400';

  const finalImageUrl = imageUrl || "https://www.wzufa.com/wp-content/uploads/2022/07/Riyadh-Al-Ebdaa-Schools.png";
  const hasValidImage = finalImageUrl && !imgError;

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className} font-sans`} dir="rtl">
      {/* Visual Logo SVG or Image */}
      {hasValidImage ? (
        <div 
          style={{ width: size, height: size }}
          className="rounded-2xl overflow-hidden flex items-center justify-center bg-transparent shrink-0"
        >
          <img 
            src={finalImageUrl} 
            alt="School Logo" 
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 200 170" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_2px_8px_rgba(115,17,26,0.04)] bg-transparent"
        >
          {/* Sunburst Rays - Procedural precise fanning */}
          <g opacity="0.95">
            {sunRays.map((ray, index) => (
              <line
                key={index}
                x1={ray.x1}
                y1={ray.y1}
                x2={ray.x2}
                y2={ray.y2}
                stroke="#e68824" /* Orange/Amber Gold logo color */
                strokeWidth={index % 2 === 0 ? "1.8" : "1.2"}
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* Central Sun core rise */}
          <path 
            d="M 90,121 C 90,111 110,111 110,121" 
            stroke="#e68824"
            strokeWidth="3"
            strokeLinecap="round"
            fill="#ffdf8c"
            fillOpacity="0.3"
          />

          {/* Layered Book Pages in Crimson/Burgundy (#7a1c22) and Amber/Orange (#e68824) */}
          {/* Book Page Layer 1: Top Thick Page (Burgundy) */}
          <path 
            d="M 100,128 C 76,104 36,104 18,124 C 38,111 76,112 100,132 C 124,112 162,111 182,124 C 164,104 124,104 100,128 Z" 
            fill="#7a1c22" 
            stroke="#7a1c22"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />

          {/* Book Page Layer 2: Middle Orange Page */}
          <path 
            d="M 100,132 C 78,112 40,111 22,129 C 40,118 78,119 100,136 Z" 
            fill="#e68824"
          />
          <path 
            d="M 100,132 C 122,112 160,111 178,129 C 160,118 122,119 100,136 Z" 
            fill="#e68824"
          />

          {/* Book Page Layer 3: Bottom Crimson Page */}
          <path 
            d="M 100,136 C 80,118 44,118 26,134 C 44,124 80,125 100,140 Z" 
            fill="#7a1c22"
          />
          <path 
            d="M 100,136 C 120,118 156,118 174,134 C 156,124 120,125 100,140 Z" 
            fill="#7a1c22"
          />

          {/* Outer subtle book bottom line */}
          <path 
            d="M 32,138 C 50,131 82,132 100,144 C 118,132 150,131 168,138" 
            stroke="#7a1c22" 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Styled Slogans & School Name Typography */}
      {showText && (
        <div className="mt-4 flex flex-col items-center select-none">
          {/* Main Beautiful Arabic School Logo Text */}
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[11px] font-black mr-4 text-emerald-600" style={{ fontFamily: 'Cairo, sans-serif' }}>
              مدارس
            </span>
            <span className={`text-[20px] font-black tracking-tight leading-none ${textColor}`} style={{ color: '#7a1c22', fontFamily: 'Cairo, sans-serif' }}>
              رِيَاضِ الإبْدَاع
            </span>
          </div>

          {/* Bilingual English subtitle */}
          <div className="mt-1 text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-1 font-mono">
            <span className="text-slate-700 font-bold" style={{ color: '#7a1c22' }}>Riyadh Al Ebdaa</span>
            <span className={`${subtitleColor} font-black`}>Schools</span>
          </div>
        </div>
      )}
    </div>
  );
}
