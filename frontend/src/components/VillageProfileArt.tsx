import React from 'react';

export const VillageProfileArt: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 720,
        height: 180,
        backgroundColor: '#F3EFE7',
        border: '1px solid #D5CDBC',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 720 180"
        style={{ width: '100%', height: '100%', display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Sky - Warm cartographic tint */}
        <rect width="720" height="180" fill="#F4EFE6" />

        {/* Distant Hills / Northridge Crest */}
        <path
          d="M0,130 Q120,70 260,110 T540,80 T720,105 L720,180 L0,180 Z"
          fill="#D6E0D2"
          opacity="0.8"
        />

        {/* Mid-ground Terrain & Terraces */}
        <path
          d="M0,140 Q180,100 360,125 T720,120 L720,180 L0,180 Z"
          fill="#C4D4BF"
        />

        {/* Aster River Curving through Foreground */}
        <path
          d="M-20,165 C140,155 240,175 420,158 C560,146 660,160 740,152 L740,180 L-20,180 Z"
          fill="#86A9BA"
        />
        {/* Water highlights */}
        <path
          d="M60,166 Q140,160 210,169 M320,163 Q410,156 480,162 M550,155 Q620,152 690,156"
          stroke="#A8C8D6"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Great Stone Bridge crossing the river */}
        <g transform="translate(330, 142)">
          <rect x="0" y="0" width="80" height="12" fill="#E2DAC7" stroke="#A69B85" strokeWidth="1" rx="1" />
          <path d="M12,12 Q24,0 36,12 M44,12 Q56,0 68,12" stroke="#8E826C" strokeWidth="1.5" fill="#789EAF" />
          <line x1="0" y1="12" x2="80" y2="12" stroke="#A69B85" strokeWidth="1" />
        </g>

        {/* Northridge Hospital on the Hill (Left-Center) */}
        <g transform="translate(240, 75)">
          <rect x="0" y="15" width="44" height="28" fill="#EFE7D8" stroke="#AFA38E" strokeWidth="1" />
          <polygon points="22,2 -4,15 48,15" fill="#A85747" stroke="#8A4234" strokeWidth="1" />
          <rect x="18" y="24" width="8" height="19" fill="#D3C7B3" />
          {/* Medical Red Cross on Clinic */}
          <rect x="19" y="18" width="6" height="2" fill="#C03623" />
          <rect x="21" y="16" width="2" height="6" fill="#C03623" />
        </g>

        {/* Old Town Quarter Bell Tower & Town Hall (Center) */}
        <g transform="translate(420, 58)">
          {/* Tower */}
          <rect x="15" y="15" width="18" height="65" fill="#DDD2BF" stroke="#9C907C" strokeWidth="1" />
          <polygon points="24,0 12,15 36,15" fill="#586754" stroke="#43503F" strokeWidth="1" />
          {/* Clock face */}
          <circle cx="24" cy="28" r="4.5" fill="#FFFDF8" stroke="#9C907C" strokeWidth="1" />
          <line x1="24" y1="28" x2="24" y2="25" stroke="#333" strokeWidth="1" />
          <line x1="24" y1="28" x2="26" y2="28" stroke="#333" strokeWidth="1" />
          {/* Main Civic Hall Body */}
          <rect x="-10" y="42" width="68" height="38" fill="#EAE2D3" stroke="#A69A85" strokeWidth="1" />
          <polygon points="24,30 -14,42 62,42" fill="#885A48" />
          {/* Windows */}
          <rect x="-2" y="52" width="6" height="10" fill="#B3C4CB" />
          <rect x="10" y="52" width="6" height="10" fill="#B3C4CB" />
          <rect x="32" y="52" width="6" height="10" fill="#B3C4CB" />
          <rect x="44" y="52" width="6" height="10" fill="#B3C4CB" />
        </g>

        {/* Clustered Cottages (Left: Millbrook Glen) */}
        <g transform="translate(90, 115)">
          <rect x="0" y="10" width="28" height="20" fill="#EAE1D2" stroke="#ABA08C" strokeWidth="1" />
          <polygon points="14,0 -3,10 31,10" fill="#996050" />
          <rect x="10" y="18" width="7" height="12" fill="#555" />
          {/* Small water mill wheel */}
          <circle cx="-6" cy="28" r="8" fill="none" stroke="#7A6852" strokeWidth="2" />
        </g>
        <g transform="translate(130, 118)">
          <rect x="0" y="8" width="24" height="18" fill="#ECE4D6" stroke="#ABA08C" strokeWidth="1" />
          <polygon points="12,0 -2,8 26,8" fill="#885B4E" />
        </g>

        {/* High Meadow Barn & Silo (Right) */}
        <g transform="translate(560, 95)">
          {/* Red Barn */}
          <rect x="10" y="15" width="46" height="30" fill="#BD5D49" stroke="#964332" strokeWidth="1" />
          <polygon points="33,0 6,15 60,15" fill="#753527" stroke="#5A271C" strokeWidth="1" />
          {/* Silo */}
          <rect x="0" y="8" width="14" height="37" fill="#D3C9B6" stroke="#9C927F" strokeWidth="1" />
          <ellipse cx="7" cy="8" rx="7" ry="4" fill="#9C927F" />
        </g>

        {/* Trees & Foliage (Natural Cartographic Green Accents) */}
        <g fill="#577A55" opacity="0.9">
          <circle cx="50" cy="135" r="9" />
          <circle cx="62" cy="132" r="11" />
          <circle cx="180" cy="128" r="8" />
          <circle cx="215" cy="108" r="9" />
          <circle cx="310" cy="130" r="10" />
          <circle cx="380" cy="125" r="8" />
          <circle cx="510" cy="115" r="12" />
          <circle cx="530" cy="118" r="9" />
          <circle cx="640" cy="120" r="11" />
          <circle cx="660" cy="124" r="8" />
        </g>

        {/* Elegant Cartographic Vignette & Title Overlay */}
        <rect x="16" y="14" width="210" height="42" fill="#FAF7F2" stroke="#D0C7B7" strokeWidth="1" rx="2" opacity="0.95" />
        <text x="26" y="32" fontFamily="var(--font-serif)" fontSize="13" fontWeight="700" letterSpacing="0.08em" fill="#1C211F">
          ASTER VALE SETTLEMENT
        </text>
        <text x="26" y="47" fontFamily="var(--font-sans)" fontSize="10" fontWeight="500" fill="#69756F">
          Est. Topographic Elevation: 240m • Sector AV-01
        </text>
      </svg>
    </div>
  );
};
