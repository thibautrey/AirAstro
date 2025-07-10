interface AirAstroLogoProps {
  className?: string;
}

export default function AirAstroLogo({ className = "h-10" }: AirAstroLogoProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 200 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Constellation/Star symbol */}
      <g>
        <circle cx="20" cy="30" r="2" fill="currentColor" />
        <circle cx="35" cy="20" r="1.5" fill="currentColor" />
        <circle cx="45" cy="35" r="1.5" fill="currentColor" />
        <circle cx="55" cy="25" r="1" fill="currentColor" />
        <line x1="20" y1="30" x2="35" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="35" y1="20" x2="55" y2="25" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="20" y1="30" x2="45" y2="35" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </g>
      
      {/* Text "AirAstro" */}
      <text 
        x="70" 
        y="38" 
        className="text-lg font-semibold" 
        fill="currentColor"
        style={{ fontFamily: 'SFCompactDisplay, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}
      >
        AirAstro
      </text>
    </svg>
  );
}
