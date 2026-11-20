import React from "react";

/** Original REALCRED paperwork illustration, drawn as inline SVG. */
export function LoanDocumentsScene() {
  return (
    <svg className="home-doc-scene" viewBox="0 0 360 178" role="img" aria-label="Loan application papers, identity document and pen">
      <defs>
        <linearGradient id="paper-wash" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#fff0ee"/></linearGradient>
        <filter id="paper-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#6d2326" floodOpacity=".12"/></filter>
      </defs>
      <rect x="1" y="1" width="358" height="176" rx="14" fill="#fff8f7"/>
      <circle cx="300" cy="36" r="52" fill="#fbe3e3" opacity=".72"/>
      <g className="doc-sheet doc-sheet--back" filter="url(#paper-shadow)" transform="rotate(-8 130 88)">
        <rect x="62" y="26" width="118" height="133" rx="7" fill="#fff" stroke="#ead1cf"/>
        <path d="M77 47h55m-55 9h73" stroke="#d7c1c0" strokeWidth="3" strokeLinecap="round"/>
        <rect x="77" y="69" width="87" height="37" rx="4" fill="#fff4f2" stroke="#f0d7d3"/>
        <path d="M86 81h54m-54 8h42" stroke="#d7c1c0" strokeWidth="2" strokeLinecap="round"/>
        <path d="m86 128 8 8 15-17" fill="none" stroke="#d62828" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M119 129h40m-40 8h31" stroke="#d7c1c0" strokeWidth="2" strokeLinecap="round"/>
      </g>
      <g className="doc-sheet doc-sheet--front" filter="url(#paper-shadow)">
        <rect x="119" y="20" width="117" height="141" rx="7" fill="url(#paper-wash)" stroke="#e5c9c6"/>
        <rect x="132" y="34" width="27" height="27" rx="6" fill="#fbe3e3"/>
        <path d="M138 43h15m-15 6h12" stroke="#b53a3a" strokeWidth="2" strokeLinecap="round"/>
        <path d="M168 41h52m-52 7h43" stroke="#bca6a5" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M132 73h91m-91 9h79m-79 9h84" stroke="#d8c6c5" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="132" y="103" width="91" height="41" rx="4" fill="#fff" stroke="#f0d9d6"/>
        <path d="M141 114h41m-41 7h66m-66 7h50" stroke="#d7c1c0" strokeWidth="2" strokeLinecap="round"/>
      </g>
      <g className="doc-pen" transform="rotate(34 264 102)" filter="url(#paper-shadow)">
        <rect x="251" y="54" width="11" height="94" rx="5.5" fill="#d62828"/>
        <path d="M251 62h11m-11 9h11" stroke="#f9a3a3" strokeWidth="2"/>
        <path d="m251 148 5.5 13 5.5-13z" fill="#8f1616"/>
        <rect x="251" y="48" width="11" height="10" rx="5" fill="#8f1616"/>
      </g>
      <g className="doc-stamp"><circle cx="292" cy="133" r="23" fill="#fff" stroke="#d62828" strokeWidth="2"/><circle cx="292" cy="133" r="17" fill="#fff5f4" stroke="#f0b7b4"/><path d="m283 133 6 6 12-13" fill="none" stroke="#d62828" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></g>
      <path d="M24 146h23m-23 7h33" stroke="#ebc7c5" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
