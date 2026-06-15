/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface BBIChapterLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export default function BBIChapterLogo({ size = 300, className, ...props }: BBIChapterLogoProps) {
  // A beautiful HTML5 SVG that renders the custom visual from the prompt screenshot
  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      className={`select-none ${className || ""}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Beta Beta Iota Chapter Logo"
      {...props}
    >
      <defs>
        {/* Gradients and shadows for extra premium depth */}
        <filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#00183b" floodOpacity="0.25" />
        </filter>
        
        {/* Curved path for "PHI BETA SIGMA FRATERNITY, INC." - perfectly centered on radius 118 */}
        <path
          id="text-path-top"
          d="M 32 150 A 118 118 0 0 1 268 150"
          fill="none"
        />
        
        {/* Curved path for bottom principles - perfectly centered on radius 118 */}
        <path
          id="text-path-bottom"
          d="M 268 150 A 118 118 0 0 1 32 150"
          fill="none"
        />
      </defs>

      {/* Main Backing Circle in Royal Blue (Official Phi Beta Sigma Blue color) */}
      <circle cx="150" cy="150" r="140" fill="#003399" filter="url(#logo-shadow)" />

      {/* Outer White Border Line */}
      <circle cx="150" cy="150" r="136" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
      
      {/* Outer Blue Text Ring lies in the space between radius 136 and radius 102.
          This ring background is just the main blue background. */}

      {/* Inner White Plate Backing (Radius 102 as per the exact design boundary) */}
      <circle cx="150" cy="150" r="102" fill="#FFFFFF" />

      {/* Inner Blue Outline inside the white area */}
      <circle cx="150" cy="150" r="97" fill="none" stroke="#003399" strokeWidth="2.0" />

      {/* Curved Text upper-half: "PHI BETA SIGMA FRATERNITY, INC." in sans-serif uppercase */}
      <text fill="#FFFFFF" fontSize="11.5" fontWeight="900" fontFamily='"Outfit", "Inter", "Helvetica", sans-serif' letterSpacing="1.5">
        <textPath href="#text-path-top" startOffset="50%" textAnchor="middle">
          PHI BETA SIGMA FRATERNITY, INC.
        </textPath>
      </text>

      {/* Outer Blue Text lower-half: "BROTHERHOOD · SCHOLARSHIP · SERVICE" */}
      <text fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily='"Outfit", "Inter", "Helvetica", sans-serif' letterSpacing="1.2">
        <textPath href="#text-path-bottom" startOffset="50%" textAnchor="middle">
          BROTHERHOOD · SCHOLARSHIP · SERVICE
        </textPath>
      </text>

      {/* Side Decorative Element: Left Stars (Exact 3-star stack aligned to curve) */}
      <g fill="#FFFFFF">
        <path d="M 0,-6 L 1.8,-1.8 L 6.2,-1.8 L 2.6,0.8 L 4,5.2 L 0,2.6 L -4,5.2 L -2.6,0.8 L -6.2,-1.8 L -1.8,-1.8 Z" transform="translate(38, 134)" />
        <path d="M 0,-6 L 1.8,-1.8 L 6.2,-1.8 L 2.6,0.8 L 4,5.2 L 0,2.6 L -4,5.2 L -2.6,0.8 L -6.2,-1.8 L -1.8,-1.8 Z" transform="translate(33, 150)" />
        <path d="M 0,-6 L 1.8,-1.8 L 6.2,-1.8 L 2.6,0.8 L 4,5.2 L 0,2.6 L -4,5.2 L -2.6,0.8 L -6.2,-1.8 L -1.8,-1.8 Z" transform="translate(38, 166)" />
      </g>

      {/* Side Decorative Element: Right Bars (3 vertical parallel lines in white) */}
      <g stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round">
        <line x1="262" y1="138" x2="262" y2="162" />
        <line x1="267" y1="133" x2="267" y2="167" />
        <line x1="272" y1="138" x2="272" y2="162" />
      </g>

      {/* --- CENTER EMBLEM ELEMENTS --- */}
      
      {/* Wave lines at the bottom of the inner core representing coastal BBI environment */}
      <g fill="none" stroke="#003399" strokeWidth="3.2" strokeLinecap="round">
        {/* Wave 1 */}
        <path d="M 68 175 C 100 162, 110 188, 150 175 C 190 162, 200 188, 232 175" />
        {/* Wave 2 */}
        <path d="M 64 185 C 95 172, 105 198, 150 185 C 195 172, 205 198, 236 185" />
        {/* Wave 3 */}
        <path d="M 72 195 C 100 186, 110 204, 150 195 C 190 186, 200 204, 228 195" />
      </g>

      {/* Vector Palm Trees in Chapter Core (Pure Royal Blue) */}
      {/* Palm Tree Left */}
      <g transform="translate(100, 75)" fill="#003399">
        {/* Trunk */}
        <path d="M 12,70 Q 15,35 25,0 Q 21,35 15,70 Z" />
        {/* Leaves */}
        <path d="M 25,0 Q 5,10 -15,5 Q 5,2 25,0" />
        <path d="M 25,0 Q 10,-8 -12,-18 Q 10,-1 25,0" />
        <path d="M 25,0 Q 22,-15 5,-32 Q 18,-15 25,0" />
        <path d="M 25,0 Q 35,-15 50,-28 Q 35,-12 25,0" />
        <path d="M 25,0 Q 42,-5 60,6 Q 38,-2 25,0" />
        <path d="M 25,0 Q 45,15 55,35 Q 38,10 25,0" />
      </g>

      {/* Palm Tree Middle */}
      <g transform="translate(133, 55)" fill="#003399">
        {/* Trunk */}
        <path d="M 17,90 Q 17,45 17,0 Q 13,45 13,90 Z" />
        {/* Leaves */}
        <path d="M 15,0 Q -10,12 -30,0 Q -5,2 15,0" />
        <path d="M 15,0 Q -5,-8 -22,-25 Q -2,2 15,0" />
        <path d="M 15,0 Q 15,-18 0,-38 Q 10,-15 15,0" />
        <path d="M 15,0 Q 15,-18 30,-38 Q 20,-15 15,0" />
        <path d="M 15,0 Q 35,-8 52,-25 Q 32,2 15,0" />
        <path d="M 15,0 Q 40,12 60,0 Q 35,2 15,0" />
      </g>

      {/* Palm Tree Right */}
      <g transform="translate(160, 75)" fill="#003399">
        {/* Trunk */}
        <path d="M 15,70 Q 12,35 2,0 Q 6,35 12,70 Z" />
        {/* Leaves */}
        <path d="M 2,0 Q -20,15 -35,35 Q -18,10 2,0" />
        <path d="M 2,0 Q -18,-5 -36,6 Q -14,-2 2,0" />
        <path d="M 2,0 Q -11,-15 -26,-28 Q -11,-12 2,0" />
        <path d="M 2,0 Q 2,-15 19,-32 Q 6,-15 2,0" />
        <path d="M 2,0 Q 14,-8 36,-18 Q 14,-1 2,0" />
        <path d="M 2,0 Q 19,10 39,5 Q 19,2 2,0" />
      </g>

      {/* Large Chapter Text BBI */}
      <text
        x="151"
        y="151"
        fontFamily='"Outfit", "Inter", "Helvetica", sans-serif'
        fontSize="66"
        fontWeight="900"
        fill="#003399"
        stroke="#FFFFFF"
        strokeWidth="6"
        paintOrder="stroke"
        textAnchor="middle"
        letterSpacing="2.5"
      >
        BBI
      </text>

      {/* Est 2004 Segment */}
      <text
        x="150"
        y="223"
        fontFamily='"Outfit", "Inter", "Helvetica", sans-serif'
        fontSize="17"
        fontWeight="900"
        fill="#003399"
        textAnchor="middle"
        letterSpacing="1"
      >
        EST. 2004
      </text>

      {/* Underline Flourish Segment: line, down triangle, line */}
      <line x1="85" y1="231" x2="135" y2="231" stroke="#003399" strokeWidth="2.0" strokeLinecap="round" />
      <polygon points="144,228 156,228 150,234" fill="#003399" />
      <line x1="165" y1="231" x2="215" y2="231" stroke="#003399" strokeWidth="2.0" strokeLinecap="round" />

      {/* Chapter Text */}
      <text
        x="150"
        y="247"
        fontFamily='"Outfit", "Inter", "Helvetica", sans-serif'
        fontSize="10.5"
        fontWeight="900"
        fill="#003399"
        textAnchor="middle"
        letterSpacing="3"
      >
        CHAPTER
      </text>
    </svg>
  );
}
