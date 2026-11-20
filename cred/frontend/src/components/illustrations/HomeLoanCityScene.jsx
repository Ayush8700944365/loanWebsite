import React from "react";

const Tower = ({ x, base, width, height, tone = "rose", delay = "0s" }) => {
  const top = base - height;
  const depth = Math.round(width * 0.26);
  const palette = tone === "warm"
    ? { front: "#fffdfd", side: "#f4dedb", roof: "#fff", line: "#d6b9b7", window: "#f8e6e3" }
    : { front: "#fff", side: "#f8e7e5", roof: "#fffafa", line: "#d9c1bf", window: "#f5dcda" };
  const floors = Math.max(3, Math.floor(height / 24));
  return (
    <g className="loan-city-tower" style={{ animationDelay: delay }}>
      <ellipse cx={x + width / 2 + depth / 3} cy={base + 5} rx={width * .78} ry="8" fill="#9c5550" opacity=".09" />
      <path d={`M${x} ${top}h${width}v${height}H${x}z`} fill={palette.front} stroke={palette.line} strokeWidth="1.2" />
      <path d={`M${x + width} ${top}l${depth} -${Math.round(depth * .48)}v${height}l-${depth} ${Math.round(depth * .48)}z`} fill={palette.side} stroke={palette.line} strokeWidth="1.2" />
      <path d={`M${x} ${top}l${depth} -${Math.round(depth * .48)}h${width}l-${depth} ${Math.round(depth * .48)}z`} fill={palette.roof} stroke={palette.line} strokeWidth="1.2" />
      {Array.from({ length: floors }, (_, i) => {
        const y = top + 12 + i * ((height - 18) / floors);
        return <g key={i} opacity={i % 3 === 0 ? ".92" : ".65"}>
          <path d={`M${x + 8} ${y}h${Math.max(8, width - 16)}`} stroke={palette.window} strokeWidth="5" strokeLinecap="round" />
          <path d={`M${x + 8} ${y}h${Math.max(8, width - 16)}`} stroke="#e6c5c2" strokeWidth=".6" />
        </g>;
      })}
      <path d={`M${x + width + 4} ${top - 7}v${Math.min(13, height / 7)}`} stroke="#b74241" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
      <circle cx={x + width + 4} cy={top - 9} r="3" fill="#d62828" className="loan-city-beacon" />
    </g>
  );
};

/** Original light-theme isometric financial district artwork for the homepage hero. */
export function HomeLoanCityScene() {
  return (
    <svg className="home-loan-city-scene" viewBox="0 0 560 420" aria-hidden="true">
      <defs>
        <linearGradient id="loan-city-sky" x1="60" y1="25" x2="510" y2="390" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset=".62" stopColor="#fff9f8"/><stop offset="1" stopColor="#f9e5e2"/></linearGradient>
        <radialGradient id="loan-city-glow"><stop stopColor="#f5b9b3" stopOpacity=".52"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></radialGradient>
        <filter id="loan-city-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#6d3231" floodOpacity=".11"/></filter>
        <pattern id="loan-city-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#d62828" opacity=".22"/></pattern>
      </defs>
      <rect x="2" y="2" width="556" height="416" rx="24" fill="url(#loan-city-sky)" />
      <circle cx="403" cy="141" r="165" fill="url(#loan-city-glow)" />
      <path d="M21 317 280 177l259 140-259 95z" fill="#fff" fillOpacity=".48" stroke="#f0d7d4" strokeWidth="1" />
      <path d="m54 315 226-122 226 122M104 342l176-95 176 95M155 369l125-68 125 68M280 190v212M204 232l151 82m-198-53 150 82m-54-136 151 82m-202 28 151 82" fill="none" stroke="#eed8d5" strokeWidth="1" strokeOpacity=".75" />
      <path d="M16 301c73-21 105-64 176-43s106 60 171 38 112-29 182 2" fill="none" stroke="#dc7772" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" opacity=".53" className="loan-city-route" />
      <g filter="url(#loan-city-shadow)">
        <Tower x={42} base={284} width={48} height={101} tone="warm" delay="-.7s" />
        <Tower x={108} base={257} width={58} height={166} delay="-.25s" />
        <Tower x={180} base={228} width={42} height={112} tone="warm" delay="-.9s" />
        <Tower x={336} base={256} width={48} height={142} delay="-.45s" />
        <Tower x={402} base={282} width={61} height={181} tone="warm" delay="-.1s" />
        <Tower x={480} base={314} width={42} height={117} delay="-.6s" />
      </g>
      <g className="loan-city-map-node"><circle cx="81" cy="309" r="14" fill="#fff" stroke="#e7c5c2"/><circle cx="81" cy="309" r="5" fill="#d62828"/><circle cx="81" cy="309" r="11" fill="none" stroke="#d62828" strokeOpacity=".35"/></g>
      <g className="loan-city-map-node loan-city-map-node--second"><circle cx="467" cy="251" r="12" fill="#fff" stroke="#e7c5c2"/><circle cx="467" cy="251" r="4" fill="#d62828"/><circle cx="467" cy="251" r="10" fill="none" stroke="#d62828" strokeOpacity=".35"/></g>
      <path d="M23 79h150v118H23z" fill="url(#loan-city-dots)" opacity=".55" />
      <path d="M44 86h44m-44 7h25" stroke="#e6c9c7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
