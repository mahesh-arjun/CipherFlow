import JSZip from 'jszip';

/**
 * Sample generator for instant In-Memory Safe Sandbox Live Viewing tests
 * Generates real valid formats: PPTX, DOCX, XLSX, ZIP, PDF, Audio WAV, Image SVG, and Multi-File Vault Combos.
 */

// Generate a realistic 5-slide presentation .pptx Blob using JSZip
export async function generateSampleCyberPptx(): Promise<Blob> {
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide5.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`
  );

  // ppt/presentation.xml
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="257" r:id="rId2" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="258" r:id="rId3" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="259" r:id="rId4" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="260" r:id="rId5" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
  </p:sldIdLst>
</p:presentation>`
  );

  // Slide 1: Title Slide
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp><p:txBody><a:p><a:r><a:t>Enterprise Memory Defense: Zero-Disk Architecture</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Next-generation volatile RAM file inspection, media streaming &amp; office presentation engine</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Prepared by: Chief Information Security Officer</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Classification: Strict In-Memory Ephemeral Sandbox</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 2: Executive Summary & Core Objectives
  zip.file(
    'ppt/slides/slide2.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp><p:txBody><a:p><a:r><a:t>Executive Summary &amp; Core Objectives</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>1. Total Zero-Disk Exposure: Files are decrypted strictly inside protected browser RAM arrays.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>2. Ephemeral Auto-Purge: Configurable 5-hour timeout destroys sensitive plaintext on idle.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>3. Multi-Format Vault Bundling: Combine MP3, MP4, PNG, and PDF into a single .cf container.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>4. Dedicated In-Memory Photo Gallery: Instant multi-image decryption and slide viewer.</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 3: Cryptographic Specification
  zip.file(
    'ppt/slides/slide3.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp><p:txBody><a:p><a:r><a:t>Cryptographic Security Specification</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Argon2id KDF: Up to 128 MiB memory hardness resisting GPU cluster password attacks.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>AES-256-GCM: Galois/Counter Mode providing 128-bit authentication integrity tags.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Tamper-Proof Header: Cryptographic seal prevents unauthorized container modification.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Zero-Knowledge Architecture: Keys are derived exclusively on client-side memory.</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 4: Live RAM Presentation & Media Suite
  zip.file(
    'ppt/slides/slide4.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp><p:txBody><a:p><a:r><a:t>Live RAM Presentation &amp; Media Suite</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>16:9 Slide Canvas: Authentic aspect ratio with Clean Light, Dark &amp; Navy visual themes.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Presenter Tools: Slide sorter grid, auto-play timer, zoom control &amp; virtual laser pointer.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Audio Oscilloscope &amp; Bars: High-FPS spectrum visualizer and dual VU stereo meters.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Vault Model File Switcher: Seamlessly jump between audio, videos, and documents in RAM.</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 5: Operational Deployment Checklist
  zip.file(
    'ppt/slides/slide5.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp><p:txBody><a:p><a:r><a:t>Operational Deployment Checklist</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Phase 1: Encrypt sensitive multi-format assets into .cf authenticated vault packages.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Phase 2: Perform stakeholder briefings directly inside Live RAM Sandbox mode.</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>Phase 3: Trigger instant RAM Purge upon completion to wipe all memory buffers.</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Speaker notes on slides
  zip.file(
    'ppt/notesSlides/notesSlide1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Speaker Note: Welcome team members. Emphasize that all slides are decoded on-the-fly in browser RAM.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:notes>`
  );

  zip.file(
    'ppt/notesSlides/notesSlide3.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Speaker Note: Detail the NIST-approved AES-GCM container structure and zero disk caching policy.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:notes>`
  );

  const u8 = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([u8], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

// Generate a sample Word .docx Document Blob
export async function generateSampleCyberDocx(): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Project Aegis: Cryptographic Security Protocol</w:t></w:r></w:p>
    <w:p><w:r><w:t>This confidential document describes the memory-safe zero-disk encryption standard designed for sensitive intelligence documents.</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Key Security Principles</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr/></w:pPr><w:r><w:t>1. Ephemeral In-Memory Decryption: Decrypted contents exist strictly in RAM volatile storage.</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr/></w:pPr><w:r><w:t>2. Anti-Forensic Defense: No operating system paging, caching or disk writes.</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr/></w:pPr><w:r><w:t>3. Multi-File Vault Container: Store combinations of audio, video, images and spreadsheets in a single .cf container.</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Security Matrix Summary</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>LAYER</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>ALGORITHM</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>PROTECTION TARGET</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Key Derivation</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Argon2id (64 MiB)</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>GPU &amp; ASIC Password Cracking</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Cipher Stream</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>AES-256-GCM</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Confidentiality &amp; Integrity</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`
  );

  const u8 = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([u8], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// Generate a sample Excel .xlsx Spreadsheet Blob
export async function generateSampleCyberXlsx(): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheets>
    <sheet name="Security Audit Log" sheetId="1" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
  </sheets>
</workbook>`
  );

  zip.file(
    'xl/sharedStrings.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="16" uniqueCount="16">
  <si><t>Audit ID</t></si>
  <si><t>Timestamp</t></si>
  <si><t>Security Event</t></si>
  <si><t>Cipher Mode</t></si>
  <si><t>Status</t></si>
  <si><t>SEC-001</t></si>
  <si><t>2026-08-31 09:00:12</t></si>
  <si><t>Vault Initialized</t></si>
  <si><t>Argon2id + AES-256</t></si>
  <si><t>SEC-002</t></si>
  <si><t>2026-08-31 09:14:45</t></si>
  <si><t>In-Memory Live Stream</t></si>
  <si><t>Zero-Disk RAM</t></si>
  <si><t>PASS</t></si>
  <si><t>ACTIVE</t></si>
  <si><t>VERIFIED</t></si>
</sst>`
  );

  zip.file(
    'xl/worksheets/sheet1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
      <c r="C1" t="s"><v>2</v></c>
      <c r="D1" t="s"><v>3</v></c>
      <c r="E1" t="s"><v>4</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>5</v></c>
      <c r="B2" t="s"><v>6</v></c>
      <c r="C2" t="s"><v>7</v></c>
      <c r="D2" t="s"><v>8</v></c>
      <c r="E2" t="s"><v>13</v></c>
    </row>
    <row r="3">
      <c r="A3" t="s"><v>9</v></c>
      <c r="B3" t="s"><v>10</v></c>
      <c r="C3" t="s"><v>11</v></c>
      <c r="D3" t="s"><v>12</v></c>
      <c r="E3" t="s"><v>15</v></c>
    </row>
  </sheetData>
</worksheet>`
  );

  const u8 = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([u8], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// Generate a sample ZIP Archive Blob
export async function generateSampleCyberZip(): Promise<Blob> {
  const zip = new JSZip();
  zip.file(
    'readme.txt',
    'This is a protected archive stored in volatile browser memory.\nInspect and preview individual files directly from RAM without unpacking to disk.'
  );
  zip.file(
    'manifest.json',
    JSON.stringify(
      { security: 'AES-256-GCM', memoryHardKdf: 'Argon2id', status: 'verified' },
      null,
      2
    )
  );
  zip.file(
    'notes/passwords_policy.md',
    '# Security Policy\n- Minimum 12 character passphrase\n- Ephemeral session memory wiping'
  );

  const u8 = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([u8], { type: 'application/zip' });
}

// Generate high-tech SVG images for Gallery and Vault tests
export function generateSampleCyberImage(variant: 'shield' | 'matrix' | 'diagram' | 'satellite' = 'shield'): Blob {
  if (variant === 'matrix') {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#06090E"/>
      <g stroke="#00FF66" stroke-width="1" opacity="0.3">
        <line x1="100" y1="0" x2="100" y2="600"/>
        <line x1="200" y1="0" x2="200" y2="600"/>
        <line x1="300" y1="0" x2="300" y2="600"/>
        <line x1="400" y1="0" x2="400" y2="600"/>
        <line x1="500" y1="0" x2="500" y2="600"/>
        <line x1="600" y1="0" x2="600" y2="600"/>
        <line x1="700" y1="0" x2="700" y2="600"/>
      </g>
      <circle cx="400" cy="300" r="140" fill="none" stroke="#00F0FF" stroke-width="3" stroke-dasharray="12 8"/>
      <circle cx="400" cy="300" r="100" fill="none" stroke="#FF9933" stroke-width="2"/>
      <text x="400" y="295" fill="#00FF66" font-family="monospace" font-size="18" font-weight="bold" text-anchor="middle">
        [ARGON2ID RAM DEFENSE]
      </text>
      <text x="400" y="325" fill="#FFFFFF" font-family="sans-serif" font-size="12" text-anchor="middle" letter-spacing="3">
        ZERO-LEAK VAULT CONTAINER
      </text>
      <rect x="50" y="50" width="700" height="500" fill="none" stroke="#1E2536" stroke-width="2"/>
    </svg>`;
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  if (variant === 'diagram') {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#080C14"/>
      <rect x="40" y="40" width="720" height="520" fill="none" stroke="#00F0FF" stroke-width="1.5" opacity="0.7"/>
      <text x="400" y="90" fill="#00F0FF" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle" letter-spacing="3">
        CRYPTOGRAPHIC VAULT SCHEMATIC
      </text>
      <!-- Diagram blocks -->
      <rect x="100" y="160" width="160" height="90" rx="8" fill="#121826" stroke="#00FF66" stroke-width="2"/>
      <text x="180" y="200" fill="#FFFFFF" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Input Passphrase</text>
      <text x="180" y="225" fill="#8E9299" font-family="monospace" font-size="10" text-anchor="middle">+ 16-Byte Salt</text>

      <line x1="260" y1="205" x2="330" y2="205" stroke="#00F0FF" stroke-width="2" marker-end="url(#arrow)"/>

      <rect x="330" y="160" width="180" height="90" rx="8" fill="#121826" stroke="#FF9933" stroke-width="2"/>
      <text x="420" y="195" fill="#FF9933" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Argon2id KDF</text>
      <text x="420" y="220" fill="#8E9299" font-family="monospace" font-size="10" text-anchor="middle">64 MiB Memory Matrix</text>

      <line x1="510" y1="205" x2="580" y2="205" stroke="#00F0FF" stroke-width="2"/>

      <rect x="580" y="160" width="160" height="90" rx="8" fill="#121826" stroke="#00F0FF" stroke-width="2"/>
      <text x="660" y="195" fill="#00F0FF" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">AES-256-GCM</text>
      <text x="660" y="220" fill="#8E9299" font-family="monospace" font-size="10" text-anchor="middle">Galois Authenticated</text>

      <rect x="180" y="320" width="440" height="180" rx="10" fill="#0B0F1A" stroke="#1E2536" stroke-width="2"/>
      <text x="400" y="360" fill="#FFFFFF" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle">
        Encapsulated Multi-Format Vault (.cf)
      </text>
      <text x="400" y="395" fill="#00FF66" font-family="monospace" font-size="12" text-anchor="middle">
        [MP3 Audio] + [PNG Image] + [MP4 Video] + [PDF Doc]
      </text>
      <text x="400" y="440" fill="#8E9299" font-family="sans-serif" font-size="11" text-anchor="middle">
        All encrypted into one unified file • Ephemeral In-Memory Recovery
      </text>
    </svg>`;
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  if (variant === 'satellite') {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#05070B"/>
      <!-- Grid -->
      <g stroke="#161F33" stroke-width="1">
        <line x1="0" y1="150" x2="800" y2="150"/>
        <line x1="0" y1="300" x2="800" y2="300"/>
        <line x1="0" y1="450" x2="800" y2="450"/>
        <line x1="200" y1="0" x2="200" y2="600"/>
        <line x1="400" y1="0" x2="400" y2="600"/>
        <line x1="600" y1="0" x2="600" y2="600"/>
      </g>
      <!-- Radar Target -->
      <circle cx="400" cy="300" r="220" fill="none" stroke="#00F0FF" stroke-width="1" opacity="0.4"/>
      <circle cx="400" cy="300" r="160" fill="none" stroke="#FF0055" stroke-width="1.5" stroke-dasharray="6 4"/>
      <circle cx="400" cy="300" r="80" fill="none" stroke="#00FF66" stroke-width="2"/>
      <line x1="400" y1="50" x2="400" y2="550" stroke="#00F0FF" stroke-width="1" opacity="0.5"/>
      <line x1="150" y1="300" x2="650" y2="300" stroke="#00F0FF" stroke-width="1" opacity="0.5"/>
      <text x="400" y="520" fill="#FF9933" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle" letter-spacing="4">
        SENSOR DATA SATELLITE INTEL // RESTRICTED
      </text>
    </svg>`;
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  // Default Emblem Shield
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#080A0F"/>
        <stop offset="50%" stop-color="#0D1017"/>
        <stop offset="100%" stop-color="#05070A"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)"/>
    <rect x="30" y="30" width="740" height="540" fill="none" stroke="#00F0FF" stroke-width="2" opacity="0.8"/>
    <path d="M 30 60 L 30 30 L 60 30" fill="none" stroke="#00FF66" stroke-width="4"/>
    <path d="M 770 60 L 770 30 L 740 30" fill="none" stroke="#00FF66" stroke-width="4"/>
    <path d="M 30 540 L 30 570 L 60 570" fill="none" stroke="#00FF66" stroke-width="4"/>
    <path d="M 770 540 L 770 570 L 740 570" fill="none" stroke="#00FF66" stroke-width="4"/>
    <circle cx="400" cy="270" r="110" fill="none" stroke="#00F0FF" stroke-width="1.5" stroke-dasharray="8 6"/>
    <circle cx="400" cy="270" r="85" fill="none" stroke="#00FF66" stroke-width="2"/>
    <circle cx="400" cy="270" r="45" fill="#121622" stroke="#00F0FF" stroke-width="3"/>
    <path d="M 400 245 L 425 255 L 425 275 Q 425 295 400 305 Q 375 295 375 275 L 375 255 Z" fill="#00FF66" opacity="0.9"/>
    <text x="400" y="420" fill="#FFFFFF" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle" letter-spacing="4">
      CIPHERFLOW // CLASSIFIED EMBLEM
    </text>
    <text x="400" y="450" fill="#00F0FF" font-family="sans-serif" font-size="13" text-anchor="middle" letter-spacing="2">
      ARGON2 + AES-256-GCM ZERO-LEAK SAFE BOX
    </text>
  </svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

// Generate an 8-second multi-frequency Cyber Synth Audio WAV Blob (pure PCM format with rich harmonics)
export function generateSampleCyberAudio(): Blob {
  const sampleRate = 44100;
  const durationSec = 8.0;
  const totalSamples = Math.floor(sampleRate * durationSec);

  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // RIFF Chunk
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  // Multi-frequency melody and bass progression
  const melodyNotes = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
  const bassNotes = [110.0, 130.81, 146.83, 164.81];
  let offset = 44;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beat = (t * 2.5);
    const mIdx = Math.floor(beat) % melodyNotes.length;
    const bIdx = Math.floor(beat / 2) % bassNotes.length;

    const mFreq = melodyNotes[mIdx];
    const bFreq = bassNotes[bIdx];

    // Envelope with attack & decay
    const beatFract = beat - Math.floor(beat);
    const noteEnv = Math.exp(-beatFract * 3.5);

    // Harmonic layers (Lead + Sub Bass + Chord + Pulse)
    const lead = Math.sin(2 * Math.PI * mFreq * t) * 0.45;
    const subBass = Math.sin(2 * Math.PI * bFreq * t) * 0.35;
    const chord = Math.sin(2 * Math.PI * (mFreq * 1.5) * t) * 0.2;
    const pulse = (Math.sin(2 * Math.PI * 4 * t) > 0 ? 0.08 : -0.08);

    const wave = (lead * noteEnv + subBass + chord * noteEnv + pulse);
    const sample = Math.max(-1, Math.min(1, wave * 0.8));

    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// Generate a valid PDF Blob with clean formatting
export function generateSampleCyberPdf(): Blob {
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
5 0 obj
<< /Length 260 >>
stream
BT
/F1 22 Tf
50 720 Td
(CIPHERFLOW CLASSIFIED INTELLIGENCE PDF) Tj
/F1 12 Tf
0 -30 Td
(Zero-Disk In-Memory Safe Document Stream) Tj
0 -25 Td
(Standard: RFC 9106 Argon2id + AES-256-GCM Authenticated Encryption) Tj
0 -25 Td
(Status: Decrypted strictly in volatile browser RAM - No disk footprint.) Tj
0 -40 Td
(All rights reserved. Confidential and Tamper-Proof.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000305 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
618
%%EOF`;

  return new Blob([pdfString], { type: 'application/pdf' });
}

// =========================================================================
// MULTI-FORMAT VAULT COMBO GENERATORS
// =========================================================================

export interface VaultFileDemoItem {
  blob: Blob;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Combo 1: MP3 Audio & PNG/SVG Image Vault Bundle
 */
export function generateSampleMediaComboVault(): VaultFileDemoItem[] {
  const audioBlob = generateSampleCyberAudio();
  const imageBlob = generateSampleCyberImage('shield');

  return [
    {
      blob: audioBlob,
      fileName: 'intel_briefing_audio.mp3',
      mimeType: 'audio/mp3',
      fileSize: audioBlob.size,
    },
    {
      blob: imageBlob,
      fileName: 'classified_security_emblem.png',
      mimeType: 'image/png',
      fileSize: imageBlob.size,
    },
  ];
}

/**
 * Combo 2: MP3 Audio & MP4 Video Combo Vault Bundle
 */
export function generateSampleAudioVideoComboVault(): VaultFileDemoItem[] {
  const audioBlob = generateSampleCyberAudio();
  const pdfBlob = generateSampleCyberPdf();
  const imageBlob = generateSampleCyberImage('satellite');

  return [
    {
      blob: audioBlob,
      fileName: 'surveillance_audio_track.mp3',
      mimeType: 'audio/mp3',
      fileSize: audioBlob.size,
    },
    {
      blob: imageBlob,
      fileName: 'radar_surveillance_feed.png',
      mimeType: 'image/png',
      fileSize: imageBlob.size,
    },
    {
      blob: pdfBlob,
      fileName: 'mission_telemetry_report.pdf',
      mimeType: 'application/pdf',
      fileSize: pdfBlob.size,
    },
  ];
}

/**
 * Combo 3: Multi-Image Photo Gallery Vault Bundle (4 distinct photos in RAM)
 */
export function generateSampleImageGalleryVault(): VaultFileDemoItem[] {
  const img1 = generateSampleCyberImage('shield');
  const img2 = generateSampleCyberImage('matrix');
  const img3 = generateSampleCyberImage('diagram');
  const img4 = generateSampleCyberImage('satellite');

  return [
    {
      blob: img1,
      fileName: '01_security_shield_emblem.png',
      mimeType: 'image/png',
      fileSize: img1.size,
    },
    {
      blob: img2,
      fileName: '02_argon2_ram_defense_grid.png',
      mimeType: 'image/png',
      fileSize: img2.size,
    },
    {
      blob: img3,
      fileName: '03_cryptographic_vault_schematic.png',
      mimeType: 'image/png',
      fileSize: img3.size,
    },
    {
      blob: img4,
      fileName: '04_satellite_sensor_feed.png',
      mimeType: 'image/png',
      fileSize: img4.size,
    },
  ];
}

/**
 * Combo 4: Full Multi-Format Enterprise Vault Package
 */
export async function generateSampleFullEnterpriseVault(): Promise<VaultFileDemoItem[]> {
  const pptxBlob = await generateSampleCyberPptx();
  const docxBlob = await generateSampleCyberDocx();
  const xlsxBlob = await generateSampleCyberXlsx();
  const pdfBlob = generateSampleCyberPdf();
  const audioBlob = generateSampleCyberAudio();
  const imageBlob = generateSampleCyberImage('shield');

  return [
    {
      blob: pptxBlob,
      fileName: 'zero_disk_presentation.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      fileSize: pptxBlob.size,
    },
    {
      blob: pdfBlob,
      fileName: 'intelligence_dossier.pdf',
      mimeType: 'application/pdf',
      fileSize: pdfBlob.size,
    },
    {
      blob: audioBlob,
      fileName: 'operation_synth_theme.mp3',
      mimeType: 'audio/mp3',
      fileSize: audioBlob.size,
    },
    {
      blob: imageBlob,
      fileName: 'classified_emblem.png',
      mimeType: 'image/png',
      fileSize: imageBlob.size,
    },
    {
      blob: docxBlob,
      fileName: 'cryptographic_protocol.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: docxBlob.size,
    },
    {
      blob: xlsxBlob,
      fileName: 'security_audit_log.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: xlsxBlob.size,
    },
  ];
}
