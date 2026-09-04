import JSZip from 'jszip';

export interface PptxParagraph {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  level?: number;
  bullet?: boolean;
}

export interface PptxTable {
  headers?: string[];
  rows: string[][];
}

export interface PptxSlide {
  slideNumber: number;
  title: string;
  subtitle?: string;
  texts: string[];
  paragraphs?: PptxParagraph[];
  tables?: PptxTable[];
  images?: string[];
  notes?: string;
  layoutType?: 'title' | 'content' | 'two-column' | 'table' | 'cards';
}

export interface PptxDocument {
  title: string;
  slideCount: number;
  slides: PptxSlide[];
  detectedRatio?: '16:9' | '4:3' | '16:10';
  slideWidthEmu?: number;
  slideHeightEmu?: number;
}

export interface DocxParagraph {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'bullet' | 'table';
  text: string;
  tableRows?: string[][];
}

export interface DocxDocument {
  title: string;
  paragraphs: DocxParagraph[];
  wordCount: number;
}

export interface XlsxSheet {
  name: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
  totalCols: number;
}

export interface XlsxDocument {
  sheets: XlsxSheet[];
}

export interface ArchiveEntry {
  path: string;
  name: string;
  size: number;
  compressedSize: number;
  isDir: boolean;
  date: Date;
  asyncGetBlob: () => Promise<Blob>;
}

export interface ArchiveDocument {
  totalFiles: number;
  totalSize: number;
  entries: ArchiveEntry[];
}

/**
 * Parse a PowerPoint .pptx file in memory using JSZip
 */
export async function parsePptxBlob(blob: Blob): Promise<PptxDocument> {
  const zip = await JSZip.loadAsync(blob);
  const slides: PptxSlide[] = [];
  const parser = new DOMParser();

  // 1. Detect Presentation Aspect Ratio from ppt/presentation.xml
  let detectedRatio: '16:9' | '4:3' | '16:10' = '16:9';
  let slideWidthEmu = 12192000;
  let slideHeightEmu = 6858000;

  if (zip.files['ppt/presentation.xml']) {
    try {
      const presXml = await zip.files['ppt/presentation.xml'].async('text');
      const presDoc = parser.parseFromString(presXml, 'application/xml');
      const sldSz = presDoc.getElementsByTagName('p:sldSz')[0];
      if (sldSz) {
        const cx = parseInt(sldSz.getAttribute('cx') || '12192000', 10);
        const cy = parseInt(sldSz.getAttribute('cy') || '6858000', 10);
        const type = (sldSz.getAttribute('type') || '').toLowerCase();
        slideWidthEmu = cx;
        slideHeightEmu = cy;

        if (type.includes('16x9') || type.includes('16:9') || type.includes('screen16x9')) {
          detectedRatio = '16:9';
        } else if (type.includes('4x3') || type.includes('4:3') || type.includes('screen4x3')) {
          detectedRatio = '4:3';
        } else if (type.includes('16x10') || type.includes('16:10') || type.includes('screen16x10')) {
          detectedRatio = '16:10';
        } else if (cx && cy) {
          const ratio = cx / cy;
          if (ratio >= 1.7) {
            detectedRatio = '16:9';
          } else if (ratio >= 1.55 && ratio <= 1.65) {
            detectedRatio = '16:10';
          } else if (ratio <= 1.45) {
            detectedRatio = '4:3';
          }
        }
      }
    } catch (e) {
      console.warn('Could not parse presentation size metadata:', e);
    }
  }

  // 2. Find all slide XML files (ppt/slides/slide1.xml, slide2.xml, ...)
  const slideFiles = Object.keys(zip.files).filter((fileName) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(fileName)
  );

  // Sort slides in natural numerical order
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  for (let i = 0; i < slideFiles.length; i++) {
    const fileName = slideFiles[i];
    const slideNumber = i + 1;
    const xmlContent = await zip.files[fileName].async('text');
    const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');

    // 2.1 Parse Slide Images from Relationships
    const slideRelsPath = `ppt/slides/_rels/${fileName.split('/').pop()}.rels`;
    const images: string[] = [];
    if (zip.files[slideRelsPath]) {
      try {
        const relsXml = await zip.files[slideRelsPath].async('text');
        const relsDoc = parser.parseFromString(relsXml, 'application/xml');
        const relElements = relsDoc.getElementsByTagName('Relationship');

        for (let r = 0; r < relElements.length; r++) {
          const relType = relElements[r].getAttribute('Type') || '';
          const target = relElements[r].getAttribute('Target') || '';
          if (relType.includes('image') && target) {
            // Target is typically like "../media/image1.png" -> ppt/media/image1.png
            const cleanTarget = target.replace(/^(\.\.\/)+/, '');
            const mediaPath = cleanTarget.startsWith('media/') ? `ppt/${cleanTarget}` : `ppt/media/${cleanTarget}`;
            const targetInZip = zip.files[mediaPath] || zip.files[cleanTarget] || zip.files[`ppt/${target}`];
            if (targetInZip) {
              const imgBlob = await targetInZip.async('blob');
              const imgUrl = URL.createObjectURL(imgBlob);
              images.push(imgUrl);
            }
          }
        }
      } catch (e) {
        console.warn(`Error resolving slide ${slideNumber} image relationships:`, e);
      }
    }

    // 2.2 Parse Tables (<a:tbl>)
    const tables: PptxTable[] = [];
    const tableNodes = xmlDoc.getElementsByTagName('a:tbl');
    for (let tIdx = 0; tIdx < tableNodes.length; tIdx++) {
      const tblNode = tableNodes[tIdx];
      const trNodes = tblNode.getElementsByTagName('a:tr');
      const tableRows: string[][] = [];

      for (let rIdx = 0; rIdx < trNodes.length; rIdx++) {
        const tr = trNodes[rIdx];
        const tcNodes = tr.getElementsByTagName('a:tc');
        const rowCells: string[] = [];

        for (let cIdx = 0; cIdx < tcNodes.length; cIdx++) {
          const tc = tcNodes[cIdx];
          const textElements = tc.getElementsByTagName('a:t');
          let cellText = '';
          for (let tx = 0; tx < textElements.length; tx++) {
            cellText += (textElements[tx].textContent || '') + ' ';
          }
          rowCells.push(cellText.trim());
        }
        if (rowCells.some((c) => c.length > 0)) {
          tableRows.push(rowCells);
        }
      }

      if (tableRows.length > 0) {
        tables.push({
          headers: tableRows.length > 1 ? tableRows[0] : undefined,
          rows: tableRows.length > 1 ? tableRows.slice(1) : tableRows,
        });
      }
    }

    // 2.3 Parse Paragraphs and Formatted Text
    const paragraphs: PptxParagraph[] = [];
    const pNodes = xmlDoc.getElementsByTagName('a:p');
    const rawTexts: string[] = [];

    for (let pIdx = 0; pIdx < pNodes.length; pIdx++) {
      const pNode = pNodes[pIdx];
      const pPr = pNode.getElementsByTagName('a:pPr')[0];
      const lvl = pPr ? parseInt(pPr.getAttribute('lvl') || '0', 10) : 0;
      const buNone = pPr?.getElementsByTagName('a:buNone').length > 0;

      const rNodes = pNode.getElementsByTagName('a:r');
      let pText = '';
      let isBold = false;
      let isItalic = false;

      for (let rIdx = 0; rIdx < rNodes.length; rIdx++) {
        const rNode = rNodes[rIdx];
        const rPr = rNode.getElementsByTagName('a:rPr')[0];
        if (rPr) {
          if (rPr.getAttribute('b') === '1' || rPr.getAttribute('b') === 'true') isBold = true;
          if (rPr.getAttribute('i') === '1' || rPr.getAttribute('i') === 'true') isItalic = true;
        }
        const tNodes = rNode.getElementsByTagName('a:t');
        for (let t = 0; t < tNodes.length; t++) {
          pText += tNodes[t].textContent || '';
        }
      }

      // Also fallback text if not inside <a:r>
      if (!pText) {
        const directT = pNode.getElementsByTagName('a:t');
        for (let dt = 0; dt < directT.length; dt++) {
          pText += directT[dt].textContent || '';
        }
      }

      pText = pText.trim();
      if (pText) {
        rawTexts.push(pText);
        paragraphs.push({
          text: pText,
          isBold,
          isItalic,
          level: lvl,
          bullet: !buNone && (lvl > 0 || pText.length > 3),
        });
      }
    }

    // Try to detect Slide Title
    let title = `Slide ${slideNumber}`;
    let subtitle: string | undefined = undefined;
    const bodyTexts: string[] = [];

    if (rawTexts.length > 0) {
      title = rawTexts[0];
      if (slideNumber === 1 && rawTexts.length > 1 && rawTexts[1].length < 180) {
        subtitle = rawTexts[1];
        bodyTexts.push(...rawTexts.slice(2));
      } else {
        bodyTexts.push(...rawTexts.slice(1));
      }
    }

    // 2.4 Parse Speaker Notes
    let notes: string | undefined = undefined;
    const notesFileName = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
    if (zip.files[notesFileName]) {
      try {
        const notesXml = await zip.files[notesFileName].async('text');
        const notesDoc = parser.parseFromString(notesXml, 'application/xml');
        const notesNodes = notesDoc.getElementsByTagName('a:t');
        const notesArr: string[] = [];
        for (let k = 0; k < notesNodes.length; k++) {
          const t = notesNodes[k].textContent?.trim();
          if (t && !t.startsWith(`Slide ${slideNumber}`) && !t.includes(`Slide ${slideNumber} of`)) {
            notesArr.push(t);
          }
        }
        if (notesArr.length > 0) {
          notes = notesArr.join(' ');
        }
      } catch {
        // ignore notes error
      }
    }

    // Determine Layout Type
    let layoutType: PptxSlide['layoutType'] = 'content';
    if (slideNumber === 1 && rawTexts.length <= 4) {
      layoutType = 'title';
    } else if (tables.length > 0) {
      layoutType = 'table';
    } else if (bodyTexts.length >= 4) {
      layoutType = 'two-column';
    } else if (bodyTexts.length >= 2) {
      layoutType = 'cards';
    }

    slides.push({
      slideNumber,
      title: title || `Slide ${slideNumber}`,
      subtitle,
      texts: bodyTexts.length > 0 ? bodyTexts : ['(Empty slide body)'],
      paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
      tables: tables.length > 0 ? tables : undefined,
      images: images.length > 0 ? images : undefined,
      notes,
      layoutType,
    });
  }

  // Document title fallback
  const mainTitle = slides.length > 0 ? slides[0].title : 'Presentation';

  return {
    title: mainTitle,
    slideCount: slides.length,
    slides: slides.length > 0 ? slides : [
      {
        slideNumber: 1,
        title: 'Empty Presentation',
        texts: ['No slides found in this presentation container.'],
        layoutType: 'title',
      }
    ],
    detectedRatio,
    slideWidthEmu,
    slideHeightEmu,
  };
}

/**
 * Parse a Word .docx file in memory using JSZip
 */
export async function parseDocxBlob(blob: Blob): Promise<DocxDocument> {
  const zip = await JSZip.loadAsync(blob);
  const docFile = zip.files['word/document.xml'];
  if (!docFile) {
    throw new Error('Invalid DOCX container: missing word/document.xml');
  }

  const xmlContent = await docFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');

  const paragraphs: DocxParagraph[] = [];
  let totalWordCount = 0;

  // Query all paragraphs and tables in body
  const body = xmlDoc.getElementsByTagName('w:body')[0];
  if (!body) {
    return { title: 'Document', paragraphs: [], wordCount: 0 };
  }

  const childNodes = body.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i] as Element;
    if (node.nodeName === 'w:p') {
      // Paragraph
      const textNodes = node.getElementsByTagName('w:t');
      let text = '';
      for (let j = 0; j < textNodes.length; j++) {
        text += textNodes[j].textContent || '';
      }
      text = text.trim();
      if (!text) continue;

      totalWordCount += text.split(/\s+/).filter(Boolean).length;

      // Check style
      const pStyle = node.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val')?.toLowerCase() || '';
      const numPr = node.getElementsByTagName('w:numPr').length > 0;

      let type: DocxParagraph['type'] = 'paragraph';
      if (pStyle.includes('heading1') || pStyle.includes('title')) {
        type = 'heading1';
      } else if (pStyle.includes('heading2') || pStyle.includes('subtitle')) {
        type = 'heading2';
      } else if (pStyle.includes('heading3')) {
        type = 'heading3';
      } else if (numPr || pStyle.includes('list') || pStyle.includes('bullet')) {
        type = 'bullet';
      }

      paragraphs.push({ type, text });
    } else if (node.nodeName === 'w:tbl') {
      // Table
      const rowNodes = node.getElementsByTagName('w:tr');
      const tableRows: string[][] = [];

      for (let r = 0; r < rowNodes.length; r++) {
        const cellNodes = rowNodes[r].getElementsByTagName('w:tc');
        const rowData: string[] = [];
        for (let c = 0; c < cellNodes.length; c++) {
          const tNodes = cellNodes[c].getElementsByTagName('w:t');
          let cellText = '';
          for (let tn = 0; tn < tNodes.length; tn++) {
            cellText += tNodes[tn].textContent || '';
          }
          rowData.push(cellText.trim());
        }
        if (rowData.length > 0) {
          tableRows.push(rowData);
        }
      }

      if (tableRows.length > 0) {
        paragraphs.push({
          type: 'table',
          text: `Table (${tableRows.length} rows)`,
          tableRows,
        });
      }
    }
  }

  const title = paragraphs.find((p) => p.type === 'heading1')?.text || 'Word Document';

  return {
    title,
    paragraphs,
    wordCount: totalWordCount,
  };
}

/**
 * Parse an Excel .xlsx file in memory using JSZip
 */
export async function parseXlsxBlob(blob: Blob): Promise<XlsxDocument> {
  const zip = await JSZip.loadAsync(blob);
  const parser = new DOMParser();

  // 1. Shared Strings pool (xl/sharedStrings.xml)
  const sharedStrings: string[] = [];
  const sharedStringsFile = zip.files['xl/sharedStrings.xml'];
  if (sharedStringsFile) {
    const ssXml = await sharedStringsFile.async('text');
    const ssDoc = parser.parseFromString(ssXml, 'application/xml');
    const siNodes = ssDoc.getElementsByTagName('si');
    for (let i = 0; i < siNodes.length; i++) {
      const tNodes = siNodes[i].getElementsByTagName('t');
      let str = '';
      for (let j = 0; j < tNodes.length; j++) {
        str += tNodes[j].textContent || '';
      }
      sharedStrings.push(str);
    }
  }

  // 2. Workbook sheet names (xl/workbook.xml)
  const sheetNames: string[] = [];
  const workbookFile = zip.files['xl/workbook.xml'];
  if (workbookFile) {
    const wbXml = await workbookFile.async('text');
    const wbDoc = parser.parseFromString(wbXml, 'application/xml');
    const sheetNodes = wbDoc.getElementsByTagName('sheet');
    for (let i = 0; i < sheetNodes.length; i++) {
      const name = sheetNodes[i].getAttribute('name') || `Sheet ${i + 1}`;
      sheetNames.push(name);
    }
  }

  // 3. Worksheets (xl/worksheets/sheet1.xml, sheet2.xml, ...)
  const sheetFiles = Object.keys(zip.files).filter((fileName) =>
    /^xl\/worksheets\/sheet\d+\.xml$/i.test(fileName)
  );
  sheetFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  const parsedSheets: XlsxSheet[] = [];

  for (let sIdx = 0; sIdx < sheetFiles.length; sIdx++) {
    const sFileName = sheetFiles[sIdx];
    const sheetName = sheetNames[sIdx] || `Sheet ${sIdx + 1}`;
    const wsXml = await zip.files[sFileName].async('text');
    const wsDoc = parser.parseFromString(wsXml, 'application/xml');

    const rowNodes = wsDoc.getElementsByTagName('row');
    const rawGrid: string[][] = [];
    let maxCols = 0;

    for (let r = 0; r < rowNodes.length; r++) {
      const cNodes = rowNodes[r].getElementsByTagName('c');
      const rowArr: string[] = [];

      for (let c = 0; c < cNodes.length; c++) {
        const cell = cNodes[c];
        const type = cell.getAttribute('t'); // 's' = shared string, 'b' = boolean, etc.
        const valNode = cell.getElementsByTagName('v')[0];
        let val = valNode ? valNode.textContent?.trim() || '' : '';

        if (type === 's') {
          const sIndex = parseInt(val, 10);
          val = sharedStrings[sIndex] !== undefined ? sharedStrings[sIndex] : val;
        }

        rowArr.push(val);
      }

      if (rowArr.length > maxCols) {
        maxCols = rowArr.length;
      }
      rawGrid.push(rowArr);
    }

    if (rawGrid.length > 0) {
      const headers = rawGrid[0].map((h, i) => h || `Col ${i + 1}`);
      const rows = rawGrid.slice(1);
      parsedSheets.push({
        name: sheetName,
        headers,
        rows,
        totalRows: rawGrid.length,
        totalCols: maxCols,
      });
    }
  }

  return {
    sheets: parsedSheets.length > 0 ? parsedSheets : [
      {
        name: 'Sheet 1',
        headers: ['Column A', 'Column B', 'Column C'],
        rows: [['(Empty spreadsheet)']],
        totalRows: 0,
        totalCols: 0,
      }
    ],
  };
}

/**
 * Parse an Archive file (.zip) in memory using JSZip
 */
export async function parseArchiveBlob(blob: Blob): Promise<ArchiveDocument> {
  const zip = await JSZip.loadAsync(blob);
  const entries: ArchiveEntry[] = [];
  let totalSize = 0;

  for (const [path, zipObj] of Object.entries(zip.files)) {
    const isDir = zipObj.dir;
    const name = path.split('/').filter(Boolean).pop() || path;
    const uncompressedSize = (zipObj as any)._data?.uncompressedSize || 0;
    const compressedSize = (zipObj as any)._data?.compressedSize || 0;
    totalSize += uncompressedSize;

    entries.push({
      path,
      name,
      size: uncompressedSize,
      compressedSize,
      isDir,
      date: zipObj.date || new Date(),
      asyncGetBlob: async () => {
        const u8 = await zipObj.async('uint8array');
        return new Blob([u8]);
      },
    });
  }

  return {
    totalFiles: entries.filter((e) => !e.isDir).length,
    totalSize,
    entries,
  };
}
