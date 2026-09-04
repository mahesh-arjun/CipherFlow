import React, { useState } from 'react';
import { motion } from 'motion/react';

export interface CipherFlowLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
  withText?: boolean;
  withTagline?: boolean;
  shieldOnly?: boolean;
  useImg?: boolean;
}

const LOGO_CANDIDATES = [
  '/WhatsApp Image 2026-09-04 at 2.44.53 PM.jpeg',
  '/WhatsApp%20Image%202026-09-04%20at%202.44.53%20PM.jpeg',
  '/WhatsApp Image 2026-09-04 at 2.44.53 PM.jpg',
  '/WhatsApp%20Image%202026-09-04%20at%202.44.53%20PM.jpg',
  '/logo.jpeg',
  '/logo.jpg',
  '/logo.png',
  '/cipherflow-logo.jpeg',
  '/cipherflow-logo.jpg',
  '/cipherflow-logo-white.png',
  '/cipherflow-logo.png',
];

export const CipherFlowLogo: React.FC<CipherFlowLogoProps> = ({
  size = 40,
  className = '',
  animate = false,
  withText = false,
  withTagline = false,
  shieldOnly = true,
  useImg = true,
}) => {
  const [candidateIdx, setCandidateIdx] = useState(0);

  // Exact Official Logo Image presentation
  if (useImg) {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        <div
          className="relative shrink-0 flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          {animate && (
            <motion.div
              animate={{
                scale: [0.96, 1.06, 0.96],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 rounded-full bg-[#CCA43B]/20 blur-md pointer-events-none"
            />
          )}
          <img
            src={LOGO_CANDIDATES[candidateIdx]}
            onError={() => {
              if (candidateIdx < LOGO_CANDIDATES.length - 1) {
                setCandidateIdx((prev) => prev + 1);
              }
            }}
            alt="CipherFlow"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {withText && (
          <div className="flex flex-col">
            <div className="flex items-center text-sm font-display font-extrabold tracking-wider uppercase leading-none">
              <span className="text-white">CIPHER</span>
              <span className="text-[#CCA43B]">FLOW</span>
            </div>
            {withTagline && (
              <span className="text-[8px] font-mono text-[#8E9299] tracking-widest uppercase mt-0.5">
                — ZERO-LEAK SECURITY SHIELD —
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default: Precision Scalable Vector Graphics (Infinite Resolution, 0 Artifacts, Pure Transparent Background)
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Subtle Ambient Cyber Glow when animated */}
        {animate && (
          <motion.div
            animate={{
              scale: [0.95, 1.15, 0.95],
              opacity: [0.25, 0.6, 0.25],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full bg-[#38BDF8]/20 blur-md pointer-events-none"
          />
        )}

        <svg
          viewBox={shieldOnly ? '0 0 1000 850' : '0 0 1000 1000'}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >
          <defs>
            {/* Rich Metallic Gold Gradients */}
            <linearGradient id="cfl-gold" x1="200" y1="100" x2="800" y2="700" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5D77F" />
              <stop offset="30%" stopColor="#CCA43B" />
              <stop offset="70%" stopColor="#E5C158" />
              <stop offset="100%" stopColor="#A87A18" />
            </linearGradient>

            <linearGradient id="cfl-gold-light" x1="450" y1="200" x2="650" y2="450" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF2B8" />
              <stop offset="35%" stopColor="#E5C158" />
              <stop offset="85%" stopColor="#CCA43B" />
              <stop offset="100%" stopColor="#B38622" />
            </linearGradient>

            {/* Deep Cyber Navy Gradients with High-Contrast Definition */}
            <linearGradient id="cfl-navy-outer" x1="250" y1="60" x2="750" y2="720" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E3A6E" />
              <stop offset="40%" stopColor="#162C54" />
              <stop offset="75%" stopColor="#0F2040" />
              <stop offset="100%" stopColor="#0B172B" />
            </linearGradient>

            <linearGradient id="cfl-navy-c" x1="360" y1="200" x2="640" y2="520" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E3E75" />
              <stop offset="50%" stopColor="#13274A" />
              <stop offset="100%" stopColor="#0A162B" />
            </linearGradient>

            <filter id="cfl-drop" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#040A14" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* ============================================================ */}
          {/* 1. SHIELD EMBLEM */}
          {/* ============================================================ */}
          <g id="shield-emblem" filter="url(#cfl-drop)">
            {/* Outer Navy Shield Border */}
            <path
              d="M 500 55
                 C 535 58 650 84 745 120
                 C 766 128 775 145 775 170
                 C 772 380 720 535 500 735
                 C 280 535 228 380 225 170
                 C 225 145 234 128 255 120
                 C 350 84 465 58 500 55 Z"
              stroke="url(#cfl-navy-outer)"
              strokeWidth="36"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
            {/* Outer Navy Shield Contrast Rim */}
            <path
              d="M 500 55
                 C 535 58 650 84 745 120
                 C 766 128 775 145 775 170
                 C 772 380 720 535 500 735
                 C 280 535 228 380 225 170
                 C 225 145 234 128 255 120
                 C 350 84 465 58 500 55 Z"
              stroke="#38BDF8"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity="0.6"
              fill="none"
            />

            {/* Inner Gold Shield Border */}
            <path
              d="M 500 95
                 C 528 98 625 122 710 154
                 C 728 161 736 175 736 195
                 C 733 365 690 495 500 680
                 C 310 495 267 365 264 195
                 C 264 175 272 161 290 154
                 C 375 122 472 98 500 95 Z"
              stroke="url(#cfl-gold)"
              strokeWidth="16"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* ============================================================ */}
          {/* 2. GEOMETRIC 'C' MONOGRAM */}
          {/* ============================================================ */}
          <path
            d="M 640 190
               L 445 190
               L 360 275
               L 360 435
               L 445 520
               L 640 520
               L 590 460
               L 475 460
               L 425 410
               L 425 300
               L 475 250
               L 590 250
               Z"
            fill="url(#cfl-navy-c)"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeOpacity="0.5"
            strokeLinejoin="round"
          />

          {/* ============================================================ */}
          {/* 3. DYNAMIC 'F' MONOGRAM (Golden Chevron Wings) */}
          {/* ============================================================ */}
          {/* Top Forward Golden Arm */}
          <path
            d="M 464 435
               L 526 270
               L 660 270
               L 600 345
               L 535 345
               L 492 455
               Z"
            fill="url(#cfl-gold-light)"
          />

          {/* Middle Forward Golden Arm */}
          <path
            d="M 488 440
               L 538 348
               L 628 348
               L 580 415
               L 522 415
               L 510 445
               Z"
            fill="url(#cfl-gold)"
          />

          {/* ============================================================ */}
          {/* 4. FLANKING CIRCUIT TRACES & NODES */}
          {/* ============================================================ */}
          {/* Left Traces */}
          <circle cx="318" cy="430" r="8.5" fill="url(#cfl-navy-outer)" stroke="#38BDF8" strokeWidth="1.5" />
          <path
            d="M 318 438
               L 318 470
               L 358 525
               L 358 565
               L 395 615"
            stroke="url(#cfl-navy-outer)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="395" cy="535" r="7" fill="url(#cfl-gold)" />
          <path
            d="M 395 542
               L 395 570
               L 435 620
               L 446 620"
            stroke="url(#cfl-gold)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Right Traces (Symmetrical) */}
          <circle cx="682" cy="430" r="8.5" fill="url(#cfl-navy-outer)" stroke="#38BDF8" strokeWidth="1.5" />
          <path
            d="M 682 438
               L 682 470
               L 642 525
               L 642 565
               L 605 615"
            stroke="url(#cfl-navy-outer)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="605" cy="535" r="7" fill="url(#cfl-gold)" />
          <path
            d="M 605 542
               L 605 570
               L 565 620
               L 554 620"
            stroke="url(#cfl-gold)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* ============================================================ */}
          {/* 5. PADLOCK AT SHIELD APEX */}
          {/* ============================================================ */}
          {/* Shackle */}
          <path
            d="M 478 600
               L 478 575
               C 478 558 488 548 500 548
               C 512 548 522 558 522 575
               L 522 600"
            stroke="url(#cfl-navy-outer)"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 478 600
               L 478 575
               C 478 558 488 548 500 548
               C 512 548 522 558 522 575
               L 522 600"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.5"
            fill="none"
          />

          {/* Body */}
          <rect
            x="465"
            y="598"
            width="70"
            height="60"
            rx="9"
            fill="url(#cfl-navy-c)"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeOpacity="0.6"
          />

          {/* Keyhole */}
          <circle cx="500" cy="621" r="5.5" fill="#FFFFFF" />
          <polygon points="496,621 504,621 502.5,638 497.5,638" fill="#FFFFFF" />

          {/* ============================================================ */}
          {/* 6. TYPOGRAPHY 'CIPHERFLOW' (if not shieldOnly) */}
          {/* ============================================================ */}
          {!shieldOnly && (
            <g id="typography" transform="translate(500, 855)">
              <text
                x="-375"
                y="0"
                fontFamily="'Plus Jakarta Sans', 'Outfit', 'Space Grotesk', system-ui, sans-serif"
                fontSize="70"
                fontWeight="900"
                letterSpacing="0.18em"
                fill="#F1F5F9"
              >
                CIPHER
              </text>
              <text
                x="55"
                y="0"
                fontFamily="'Plus Jakarta Sans', 'Outfit', 'Space Grotesk', system-ui, sans-serif"
                fontSize="70"
                fontWeight="900"
                letterSpacing="0.18em"
                fill="url(#cfl-gold)"
              >
                FLOW
              </text>
            </g>
          )}
        </svg>
      </div>

      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center text-sm font-display font-extrabold tracking-wider uppercase leading-none">
            <span className="text-white">CIPHER</span>
            <span className="text-[#CCA43B]">FLOW</span>
          </div>
          {withTagline && (
            <span className="text-[8px] font-mono text-[#8E9299] tracking-widest uppercase mt-0.5">
              — ZERO-LEAK SECURITY SHIELD —
            </span>
          )}
        </div>
      )}
    </div>
  );
};

