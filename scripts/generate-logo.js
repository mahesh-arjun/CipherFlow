import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

// Create the definitive high-precision SVG matching the user's uploaded logo
function createCipherFlowSVG({ isDark = false, shieldOnly = false } = {}) {
  const navyColor = isDark ? '#38BDF8' : '#0B172B';
  const navyFill = isDark ? '#13233E' : '#0B172B';
  const navyStroke = isDark ? '#38BDF8' : '#0B172B';
  const goldColor = '#CCA43B';
  const goldBright = '#E8BE53';
  const textColorNavy = isDark ? '#F1F5F9' : '#0B172B';

  const viewBox = shieldOnly ? "0 0 1000 850" : "0 0 1000 1000";
  const height = shieldOnly ? 850 : 1000;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="1000" height="${height}" fill="none">
  <defs>
    <!-- Rich Gold Gradients -->
    <linearGradient id="cf-gold" x1="200" y1="100" x2="800" y2="700" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#E5C158" />
      <stop offset="25%" stopColor="#CCA43B" />
      <stop offset="65%" stopColor="#E9C55D" />
      <stop offset="100%" stopColor="#B38622" />
    </linearGradient>

    <linearGradient id="cf-gold-metal" x1="400" y1="200" x2="650" y2="450" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#F5D97D" />
      <stop offset="45%" stopColor="#CCA43B" />
      <stop offset="100%" stopColor="#B0831D" />
    </linearGradient>

    <!-- Deep Tech Navy Gradients -->
    <linearGradient id="cf-navy" x1="200" y1="50" x2="800" y2="700" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="${isDark ? '#1E3A6E' : '#0D1E3A'}" />
      <stop offset="50%" stopColor="${isDark ? '#162C54' : '#09152B'}" />
      <stop offset="100%" stopColor="${isDark ? '#0F2040' : '#060E1E'}" />
    </linearGradient>

    <filter id="cf-glow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#050E20" flood-opacity="0.28" />
    </filter>
  </defs>

  <!-- ========================================== -->
  <!-- 1. SHIELD CONTOUR                          -->
  <!-- ========================================== -->
  <g id="shield-contour" filter="url(#cf-glow)">
    <!-- Outer Navy Shield (thick border) -->
    <path
      d="M 500 55
         C 535 58 650 84 745 120
         C 766 128 775 145 775 170
         C 772 380 720 535 500 735
         C 280 535 228 380 225 170
         C 225 145 234 128 255 120
         C 350 84 465 58 500 55 Z"
      stroke="url(#cf-navy)"
      stroke-width="36"
      stroke-linejoin="round"
      stroke-linecap="round"
      fill="none"
    />

    <!-- Inner Gold Shield (concentric offset) -->
    <path
      d="M 500 95
         C 528 98 625 122 710 154
         C 728 161 736 175 736 195
         C 733 365 690 495 500 680
         C 310 495 267 365 264 195
         C 264 175 272 161 290 154
         C 375 122 472 98 500 95 Z"
      stroke="url(#cf-gold)"
      stroke-width="16"
      stroke-linejoin="round"
      stroke-linecap="round"
      fill="none"
    />
  </g>

  <!-- ========================================== -->
  <!-- 2. GEOMETRIC 'C' MONOGRAM                  -->
  <!-- ========================================== -->
  <g id="c-monogram">
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
      fill="url(#cf-navy)"
      stroke="${isDark ? '#38BDF8' : 'none'}"
      stroke-width="${isDark ? '3' : '0'}"
      stroke-linejoin="round"
    />
  </g>

  <!-- ========================================== -->
  <!-- 3. STYLIZED 'F' MONOGRAM (Golden Chevrons) -->
  <!-- ========================================== -->
  <g id="f-monogram">
    <!-- Top Forward Arm of 'F' -->
    <path
      d="M 464 435
         L 526 270
         L 660 270
         L 600 345
         L 535 345
         L 492 455
         Z"
      fill="url(#cf-gold-metal)"
    />

    <!-- Middle Forward Arm of 'F' -->
    <path
      d="M 488 440
         L 538 348
         L 628 348
         L 580 415
         L 522 415
         L 510 445
         Z"
      fill="url(#cf-gold)"
    />
  </g>

  <!-- ========================================== -->
  <!-- 4. CIRCUIT TRACES & CONNECTION NODES       -->
  <!-- ========================================== -->
  <g id="circuit-traces">
    <!-- LEFT SIDE TRACES -->
    <!-- Outer Navy Circuit Trace -->
    <circle cx="318" cy="430" r="8.5" fill="url(#cf-navy)" />
    <path
      d="M 318 438
         L 318 470
         L 358 525
         L 358 565
         L 395 615"
      stroke="url(#cf-navy)"
      stroke-width="5.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />

    <!-- Inner Gold Circuit Trace -->
    <circle cx="395" cy="535" r="7" fill="url(#cf-gold)" />
    <path
      d="M 395 542
         L 395 570
         L 435 620
         L 446 620"
      stroke="url(#cf-gold)"
      stroke-width="4.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />

    <!-- RIGHT SIDE TRACES (Symmetrical) -->
    <!-- Outer Navy Circuit Trace -->
    <circle cx="682" cy="430" r="8.5" fill="url(#cf-navy)" />
    <path
      d="M 682 438
         L 682 470
         L 642 525
         L 642 565
         L 605 615"
      stroke="url(#cf-navy)"
      stroke-width="5.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />

    <!-- Inner Gold Circuit Trace -->
    <circle cx="605" cy="535" r="7" fill="url(#cf-gold)" />
    <path
      d="M 605 542
         L 605 570
         L 565 620
         L 554 620"
      stroke="url(#cf-gold)"
      stroke-width="4.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
  </g>

  <!-- ========================================== -->
  <!-- 5. PADLOCK AT SHIELD APEX                  -->
  <!-- ========================================== -->
  <g id="padlock">
    <!-- Shackle -->
    <path
      d="M 478 600
         L 478 575
         C 478 558 488 548 500 548
         C 512 548 522 558 522 575
         L 522 600"
      stroke="url(#cf-navy)"
      stroke-width="11"
      stroke-linecap="round"
      fill="none"
    />

    <!-- Body -->
    <rect
      x="465"
      y="598"
      width="70"
      height="60"
      rx="9"
      fill="url(#cf-navy)"
      stroke="${isDark ? '#38BDF8' : 'none'}"
      stroke-width="${isDark ? '2' : '0'}"
    />

    <!-- Keyhole -->
    <circle cx="500" cy="621" r="5.5" fill="#FFFFFF" />
    <polygon points="496,621 504,621 502.5,638 497.5,638" fill="#FFFFFF" />
  </g>

  ${shieldOnly ? '' : `
  <!-- ========================================== -->
  <!-- 6. TYPOGRAPHY 'CIPHERFLOW'                 -->
  <!-- ========================================== -->
  <g id="typography" transform="translate(500, 855)">
    <!-- CIPHER in Navy -->
    <text
      x="-375"
      y="0"
      font-family="'Plus Jakarta Sans', 'Outfit', 'Space Grotesk', system-ui, -apple-system, sans-serif"
      font-size="70"
      font-weight="900"
      letter-spacing="0.18em"
      fill="${textColorNavy}"
    >CIPHER</text>

    <!-- FLOW in Gold -->
    <text
      x="55"
      y="0"
      font-family="'Plus Jakarta Sans', 'Outfit', 'Space Grotesk', system-ui, -apple-system, sans-serif"
      font-size="70"
      font-weight="900"
      letter-spacing="0.18em"
      fill="url(#cf-gold)"
    >FLOW</text>
  </g>
  `}
</svg>`;
}

async function run() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Generate full logo with text (transparent background)
  const fullSVG = createCipherFlowSVG({ isDark: false, shieldOnly: false });
  fs.writeFileSync(path.join(publicDir, 'cipherflow-logo.svg'), fullSVG);

  // 2. Generate shield-only logo (for avatars, app icons, favicons)
  const shieldSVG = createCipherFlowSVG({ isDark: false, shieldOnly: true });
  fs.writeFileSync(path.join(publicDir, 'cipherflow-shield.svg'), shieldSVG);

  // 3. Generate dark-mode optimized SVG
  const darkSVG = createCipherFlowSVG({ isDark: true, shieldOnly: false });
  fs.writeFileSync(path.join(publicDir, 'cipherflow-logo-dark.svg'), darkSVG);

  // 4. Render 2048x2048 high-res PNGs using @resvg/resvg-js
  console.log('Rendering 2048x2048 transparent and white-bg PNGs...');
  const resvgFull2048 = new Resvg(fullSVG, {
    fitTo: { mode: 'width', value: 2048 },
    background: 'rgba(0, 0, 0, 0)', // Completely transparent background
  });
  const png2048 = resvgFull2048.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'cipherflow-logo.png'), png2048);
  console.log(`Saved public/cipherflow-logo.png (2048x2048, ${png2048.length} bytes)`);

  // Render White Background Version (matching uploaded image with crisp white background)
  const resvgWhiteBg2048 = new Resvg(fullSVG, {
    fitTo: { mode: 'width', value: 2048 },
    background: '#FFFFFF',
  });
  const pngWhite2048 = resvgWhiteBg2048.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'cipherflow-logo-white.png'), pngWhite2048);
  console.log(`Saved public/cipherflow-logo-white.png (2048x2048, ${pngWhite2048.length} bytes)`);

  const resvgWhiteBg512 = new Resvg(fullSVG, {
    fitTo: { mode: 'width', value: 512 },
    background: '#FFFFFF',
  });
  const pngWhite512 = resvgWhiteBg512.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'cipherflow-logo-white-512.png'), pngWhite512);

  // 5. Render 1024x1024 and 512x512 versions
  const resvgFull1024 = new Resvg(fullSVG, {
    fitTo: { mode: 'width', value: 1024 },
    background: 'rgba(0, 0, 0, 0)',
  });
  const png1024 = resvgFull1024.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'cipherflow-logo-1024.png'), png1024);

  const resvgFull512 = new Resvg(fullSVG, {
    fitTo: { mode: 'width', value: 512 },
    background: 'rgba(0, 0, 0, 0)',
  });
  const png512 = resvgFull512.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'cipherflow-logo-512.png'), png512);

  // 6. Render Shield-only 512x512 and favicon
  const resvgShield = new Resvg(shieldSVG, {
    fitTo: { mode: 'width', value: 512 },
    background: 'rgba(0, 0, 0, 0)',
  });
  const shieldPng = resvgShield.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'cipherflow-shield.png'), shieldPng);

  const resvgFavicon = new Resvg(shieldSVG, {
    fitTo: { mode: 'width', value: 128 },
    background: 'rgba(0, 0, 0, 0)',
  });
  const faviconPng = resvgFavicon.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconPng);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), shieldSVG);

  console.log('All logo assets generated successfully!');
}

run().catch(console.error);
