import React, { useId } from "react";

const SCENES = {
  "home-loan": { kind: "home", label: "A home taking shape" },
  "balance-transfer": { kind: "transfer", label: "A clearer repayment path" },
  "plot-loan": { kind: "plot", label: "Room to build" },
  "personal-loan": { kind: "personal", label: "Funding for personal plans" },
  "business-loan": { kind: "business", label: "A business ready to grow" },
  "loan-against-property": { kind: "property", label: "Property-backed planning" },
  "vehicle-loan": { kind: "vehicle", label: "A new road ahead" },
  "education-loan": { kind: "education", label: "A future in progress" },
};

export function HomeLoanScene({ type }) {
  const id = useId().replace(/:/g, "");
  const scene = SCENES[type] || SCENES["home-loan"];
  return (
    <svg className={`home-loan-scene home-loan-scene--${scene.kind}`} viewBox="0 0 360 150" role="img" aria-label={scene.label}>
      <rect width="360" height="150" rx="10" fill={`url(#${id}-scene-bg)`} />
      <defs>
        <linearGradient id={`${id}-scene-bg`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff8f6"/><stop offset="1" stopColor="#f8e6e3"/></linearGradient>
        <linearGradient id="scene-red" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ef6664"/><stop offset="1" stopColor="#b91e26"/></linearGradient>
      </defs>
      <circle cx="292" cy="36" r="22" fill="#fff" opacity=".72" />
      <path d="M0 119c45-18 77-10 116-1 48 11 76-14 119-8 46 7 78 4 125-8v48H0z" fill="#f0d8d4" />
      {scene.kind === "home" && <g className="scene-main"><path d="m74 86 70-56 70 56v44H74z" fill="#fff" stroke="#7d3034" strokeWidth="3" strokeLinejoin="round"/><path d="M63 87 144 23l81 64" fill="none" stroke="url(#scene-red)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/><path d="M132 130V91h27v39" fill="#f5c7bf" stroke="#7d3034" strokeWidth="2"/><rect x="91" y="93" width="25" height="22" rx="3" fill="#fbe8e3" stroke="#d75a56" strokeWidth="2"/><rect x="173" y="93" width="25" height="22" rx="3" fill="#fbe8e3" stroke="#d75a56" strokeWidth="2"/><path d="M103 94v20m82-20v20" stroke="#d75a56" strokeWidth="2"/><rect x="251" y="62" width="54" height="67" rx="6" fill="#fff" stroke="#dfb8b4" strokeWidth="2"/><path d="M267 84h22m-22 10h22m-22 10h14" stroke="#c34241" strokeWidth="3" strokeLinecap="round"/><circle cx="279" cy="48" r="13" fill="#d62828"/><path d="M273 48h12m-6-6v12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></g>}
      {scene.kind === "transfer" && <g className="scene-main"><rect x="65" y="33" width="95" height="91" rx="9" fill="#fff" stroke="#e3c4c0" strokeWidth="2"/><path d="M83 56h53m-53 13h35m-35 13h44" stroke="#d7c2bf" strokeWidth="4" strokeLinecap="round"/><path d="M194 54h74a17 17 0 0 1 0 34h-74" fill="none" stroke="#d62828" strokeWidth="6" strokeLinecap="round"/><path d="m204 45-12 9 12 9" fill="none" stroke="#d62828" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="264" cy="71" r="25" fill="#fff" stroke="#d62828" strokeWidth="3"/><path d="m253 71 8 8 15-17" fill="none" stroke="#b91e26" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>}
      {scene.kind === "plot" && <g className="scene-main"><path d="m75 112 76-55 76 55" fill="#fff" stroke="#a44443" strokeWidth="3" strokeLinejoin="round"/><path d="M98 111V89h106v22" fill="#f9dcd7" stroke="#d62828" strokeWidth="3"/><path d="m254 120 14-40 14 40m-27-22h27" stroke="#a44443" strokeWidth="3" strokeLinecap="round"/><path d="M77 124h153" stroke="#d62828" strokeWidth="4" strokeLinecap="round"/><circle cx="284" cy="41" r="14" fill="#fff"/><path d="M284 32v18m-7-11h14" stroke="#d62828" strokeWidth="2"/></g>}
      {scene.kind === "personal" && <g className="scene-main"><circle cx="142" cy="78" r="47" fill="#fff" stroke="#ecc8c3" strokeWidth="2"/><circle cx="142" cy="78" r="31" fill="#fff1ed"/><path d="M142 57v42m13-30c-4-9-23-9-26 1-5 15 25 8 25 22-1 12-21 15-30 5" fill="none" stroke="#d62828" strokeWidth="4" strokeLinecap="round"/><rect x="221" y="48" width="76" height="70" rx="9" fill="#fff" stroke="#e5c4c1" strokeWidth="2"/><path d="M239 98V83h13v15m7 0V68h13v30m7 0V58h13v40" fill="#f3aaa2" stroke="#c63a3b" strokeWidth="2"/><circle cx="295" cy="38" r="12" fill="#d62828"/><path d="m289 38 4 4 8-9" fill="none" stroke="#fff" strokeWidth="2"/></g>}
      {scene.kind === "business" && <g className="scene-main"><path d="M76 66h107v64H76z" fill="#fff" stroke="#934443" strokeWidth="3"/><path d="M68 66h123l-12-27H80z" fill="#e85a56" stroke="#934443" strokeWidth="3" strokeLinejoin="round"/><path d="M96 66v64m25-64v64m27-64v64" stroke="#e2beb8" strokeWidth="2"/><rect x="213" y="59" width="85" height="70" rx="8" fill="#fff" stroke="#dfb9b4" strokeWidth="2"/><path d="M229 105V90h11v15m8 0V79h11v26m8 0V68h11v37" fill="#efaaa3"/><path d="m224 52 26-15 26 15" fill="none" stroke="#d62828" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>}
      {scene.kind === "property" && <g className="scene-main"><path d="M73 119V58l55-28 55 28v61" fill="#fff" stroke="#9a4645" strokeWidth="3"/><path d="M97 119V80h25v39m24-49h20v18h-20" fill="#f8d9d4" stroke="#d62828" strokeWidth="2"/><rect x="226" y="48" width="67" height="79" rx="8" fill="#fff" stroke="#e4c1bc" strokeWidth="2"/><path d="M241 70h36m-36 12h36m-36 12h25" stroke="#c44845" strokeWidth="3" strokeLinecap="round"/><circle cx="280" cy="108" r="8" fill="#d62828"/></g>}
      {scene.kind === "vehicle" && <g className="scene-main"><path d="m76 93 13-31c2-5 6-8 12-8h92c7 0 12 4 15 10l14 29v27H76z" fill="#fff" stroke="#983c3d" strokeWidth="3" strokeLinejoin="round"/><path d="m104 59-11 29h109l-13-29z" fill="#f5cfca" stroke="#d62828" strokeWidth="2"/><circle cx="111" cy="119" r="13" fill="#482e32"/><circle cx="111" cy="119" r="5" fill="#fff"/><circle cx="193" cy="119" r="13" fill="#482e32"/><circle cx="193" cy="119" r="5" fill="#fff"/><path d="M243 106h44m-22-21v42" stroke="#d62828" strokeWidth="4" strokeLinecap="round"/><circle cx="265" cy="106" r="32" fill="none" stroke="#fff" strokeWidth="7"/></g>}
      {scene.kind === "education" && <g className="scene-main"><path d="M74 53c24-13 47-11 70 5v67c-23-16-46-18-70-5zm140 0c-24-13-47-11-70 5v67c23-16 46-18 70-5z" fill="#fff" stroke="#974345" strokeWidth="3" strokeLinejoin="round"/><path d="M92 69c12-5 24-4 36 3m-36 12c12-5 24-4 36 3m50-15c12-7 24-8 36-3m-36 18c12-7 24-8 36-3" fill="none" stroke="#db6d68" strokeWidth="3" strokeLinecap="round"/><path d="m258 44 7 16 17 2-13 11 4 17-15-9-15 9 4-17-13-11 17-2z" fill="#d62828"/><path d="M262 103h40m-35 9h30" stroke="#c64d4a" strokeWidth="3" strokeLinecap="round"/></g>}
      <circle className="scene-sparkle scene-sparkle--one" cx="47" cy="43" r="3" fill="#d62828"/><circle className="scene-sparkle scene-sparkle--two" cx="320" cy="105" r="2.5" fill="#d62828"/>
    </svg>
  );
}
