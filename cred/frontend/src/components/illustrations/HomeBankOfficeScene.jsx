import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export function HomeBankOfficeScene() {
  const [doorOpen, setDoorOpen] = useState(false);
  useEffect(() => {
    const openDoorTimer = window.setTimeout(() => setDoorOpen(true), 2800);
    return () => window.clearTimeout(openDoorTimer);
  }, []);
  return (
    <div className="home-office-scene-wrap">
    <svg className="home-bank-office-scene" viewBox="0 0 560 420" role="img" aria-label="Illustration of a modern lending office and branch">
      <defs>
        <linearGradient id="office-sky" x1="80" y1="20" x2="480" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset="1" stopColor="#f8dfdc"/></linearGradient>
        <linearGradient id="office-glass" x1="180" y1="155" x2="390" y2="335" gradientUnits="userSpaceOnUse"><stop stopColor="#f9d8d3"/><stop offset="1" stopColor="#f1bdb6"/></linearGradient>
        <filter id="office-shadow" filterUnits="userSpaceOnUse" x="60" y="65" width="440" height="350" colorInterpolationFilters="sRGB"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#562b2e" floodOpacity=".12"/></filter>
      </defs>
      <rect x="10" y="10" width="540" height="400" rx="24" fill="url(#office-sky)" fillOpacity=".34" />
      <circle cx="430" cy="110" r="82" fill="#fbe7e3" />
      <path d="M40 344h480" stroke="#dfc2be" strokeWidth="2" strokeLinecap="round" />
      <g className="office-building" filter="url(#office-shadow)">
        <path d="M105 152h350v191H105z" fill="#fff" stroke="#ddc3bf" strokeWidth="2" />
        <path d="M87 152h386l-26-48H113z" fill="#d62828" />
        <path d="M109 151h342v21H109z" fill="#8f1616" opacity=".13" />
        <path d="M134 187h111v98H134z" fill="url(#office-glass)" stroke="#b66a67" strokeWidth="2" />
        <path d="M146 199h86v73h-86z" fill="#fff" opacity=".78" />
        <path d="M188 199v73m-42-35h86" stroke="#d5aaa5" strokeWidth="2" />
        <path d="M274 187h150v29H274z" fill="#fff7f5" stroke="#e4c7c2" strokeWidth="2" />
        <circle cx="292" cy="201" r="6" fill="#d62828" />
        <path d="M307 198h98m-98 7h67" stroke="#85565a" strokeWidth="2" strokeLinecap="round" />
        <path d="M273 229h151v114H273z" fill="#fff" stroke="#d9b8b3" strokeWidth="2" />
        <path d="M287 243h122v86H287z" fill="#fbefed" />
        <path className={`office-interior ${doorOpen ? "is-visible" : ""}`} d="M299 253h42v76h-42z" fill="#f3c982" />
        <path className={`office-interior-desk ${doorOpen ? "is-visible" : ""}`} d="M306 292h27v5h-27zm4 5v13m18-13v13" fill="none" stroke="#a76443" strokeWidth="2.5" strokeLinecap="round" />
        <g className={`office-door ${doorOpen ? "is-open" : ""}`}>
          <path d="M299 253h42v76h-42z" fill="#f1c9c3" stroke="#ba7770" strokeWidth="2" />
          <path d="M306 261h27v30h-27z" fill="#fff1ed" opacity=".85" />
          <circle cx="334" cy="307" r="2.2" fill="#a74948" />
        </g>
        <path d="M350 253h47v34h-47z" fill="#fff" stroke="#ddbab5" strokeWidth="2" />
        <path d="M350 297h47v32h-47z" fill="#fff" stroke="#ddbab5" strokeWidth="2" />
        <path d="M373 253v34m-23-17h47m-24 27v32m-23-16h47" stroke="#d6aaa4" strokeWidth="2" />
        <path d="M118 343h324" stroke="#b9847e" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="office-tree office-tree--left"><path d="M76 337h24m-12 0v-56" stroke="#87615a" strokeWidth="5" strokeLinecap="round"/><circle cx="88" cy="263" r="24" fill="#d8e7d8"/><circle cx="73" cy="281" r="15" fill="#e8efe5"/><circle cx="102" cy="284" r="16" fill="#c9ddca"/></g>
      <g className="office-tree office-tree--right"><path d="M467 337h26m-13 0v-47" stroke="#87615a" strokeWidth="5" strokeLinecap="round"/><circle cx="480" cy="275" r="21" fill="#d8e7d8"/><circle cx="466" cy="291" r="13" fill="#e8efe5"/><circle cx="494" cy="293" r="14" fill="#c9ddca"/></g>
      <g className="office-floating-card"><rect x="338" y="62" width="150" height="58" rx="10" fill="#fff" stroke="#ead4d0"/><image href="/logo/realcred-mark.svg" x="348" y="73" width="36" height="36"/><text x="393" y="88" fill="#1b1b1f" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700">REALCRED</text><text x="393" y="103" fill="#8f1616" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="700" letterSpacing=".6">zero hidden charges</text></g>
      <path className="office-route" d="M53 365c47-14 85 6 132-2 40-7 57-23 91-24" stroke="#d62828" strokeOpacity=".38" strokeWidth="2" strokeDasharray="5 8" strokeLinecap="round" />
      <circle className="office-route-dot" cx="280" cy="339" r="5" fill="#d62828" />
    </svg>
    {doorOpen && <span className="home-office-welcome" role="status">Welcome inside</span>}
    <div className="home-office-caption"><span className="home-office-caption-icon"><span><ArrowRight size={17} /></span></span><div><strong>REALCRED</strong><small>{doorOpen ? "Welcome inside" : "Guidance across loan options"}</small></div><button type="button" aria-label={doorOpen ? "Close the office door" : "Open the office door"} aria-pressed={doorOpen} onClick={() => setDoorOpen((open) => !open)}>{doorOpen ? "Close door" : "Step inside"}<ArrowRight size={13} /></button></div>
    </div>
  );
}
