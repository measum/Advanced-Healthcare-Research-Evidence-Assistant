import { inflateSync } from "node:zlib";

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_EXTRACTED_TEXT_CHARS = 2_000_000;
export const MAX_PDF_PAGES = 2_000;

export type PdfPageText = {
  pageNumber: number | null;
  text: string;
};

export type ExtractedPdf = {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
  pages: PdfPageText[];
};

export type PdfInspection = {
  isPdf: boolean;
  suspiciousFeatures: string[];
};

export class PdfProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfProcessingError";
  }
}

function bytesToBinary(buffer: ArrayBuffer | Uint8Array): string {
  const uint8 = buffer instanceof Uint8Array
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  return Array.from(uint8, (byte) => String.fromCharCode(byte)).join("");
}

export function inspectPdfBytes(buffer: ArrayBuffer | Uint8Array): PdfInspection {
  const uint8 = buffer instanceof Uint8Array
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  if (uint8.byteLength < 5) return { isPdf: false, suspiciousFeatures: [] };

  const binary = bytesToBinary(uint8.subarray(0, Math.min(uint8.byteLength, 2_000_000)));
  const suspiciousFeatures: string[] = [];
  const patterns: Array<[string, RegExp]> = [
    ["embedded JavaScript", /\/(?:JavaScript|JS)\b/i],
    ["launch action", /\/Launch\b/i],
    ["external form submission", /\/(?:SubmitForm|ImportData)\b/i],
    ["embedded executable content", /\/EmbeddedFile\b/i],
  ];
  for (const [label, pattern] of patterns) {
    if (pattern.test(binary)) suspiciousFeatures.push(label);
  }

  return {
    isPdf: binary.startsWith("%PDF-"),
    suspiciousFeatures,
  };
}

function decodePdfString(raw: string): string {
  return raw
    .replace(/\\([0-7]{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractTextFromStream(streamData: string): string {
  const textChunks: string[] = [];
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = tjRegex.exec(streamData)) !== null) {
    textChunks.push(decodePdfString(match[1]));
  }

  const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(streamData)) !== null) {
    const strRegex = /\(([^)]*)\)/g;
    let strMatch: RegExpExecArray | null;
    let combined = "";
    while ((strMatch = strRegex.exec(match[1])) !== null) {
      combined += decodePdfString(strMatch[1]);
    }
    if (combined) textChunks.push(combined);
  }

  return textChunks.join(" ");
}

function capText(value: string): string {
  return value.length > MAX_EXTRACTED_TEXT_CHARS
    ? `${value.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n[Extraction truncated at the configured text limit.]`
    : value;
}

/**
 * Extract text from simple, unencrypted PDFs. This is intentionally bounded
 * and conservative; encrypted, scanned, or unsupported PDFs must go through
 * a separately isolated OCR/extraction worker before being treated as text.
 */
export function extractPdfText(buffer: ArrayBuffer | Uint8Array): ExtractedPdf {
  const uint8 = buffer instanceof Uint8Array
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  if (uint8.byteLength > MAX_PDF_BYTES) throw new PdfProcessingError("PDF exceeds the processing size limit.");

  const inspection = inspectPdfBytes(uint8);
  if (!inspection.isPdf) throw new PdfProcessingError("The document does not have a valid PDF signature.");

  const binaryString = bytesToBinary(uint8);
  const pageMatches = binaryString.match(/\/Type\s*\/Page\b/g);
  const pageCount = Math.min(pageMatches?.length ?? 1, MAX_PDF_PAGES);
  if ((pageMatches?.length ?? 1) > MAX_PDF_PAGES) throw new PdfProcessingError("PDF exceeds the page processing limit.");

  const metadata: ExtractedPdf["metadata"] = {};
  const titleMatch = binaryString.match(/\/Title\s*\(([^)]+)\)/);
  if (titleMatch) metadata.title = decodePdfString(titleMatch[1]);
  const authorMatch = binaryString.match(/\/Author\s*\(([^)]+)\)/);
  if (authorMatch) metadata.author = decodePdfString(authorMatch[1]);
  const subjectMatch = binaryString.match(/\/Subject\s*\(([^)]+)\)/);
  if (subjectMatch) metadata.subject = decodePdfString(subjectMatch[1]);

  const streamTexts: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch: RegExpExecArray | null;
  while ((streamMatch = streamRegex.exec(binaryString)) !== null) {
    const rawContent = streamMatch[1];
    const precedingHeader = binaryString.slice(Math.max(0, streamMatch.index - 300), streamMatch.index);
    let streamBytes: Uint8Array;
    if (precedingHeader.includes("/FlateDecode")) {
      try {
        streamBytes = new Uint8Array(inflateSync(Buffer.from(rawContent, "binary")));
      } catch {
        // Leave the stream unexpanded; it may still contain directly readable text.
        streamBytes = new Uint8Array(Buffer.from(rawContent, "binary"));
      }
    } else {
      streamBytes = new Uint8Array(Buffer.from(rawContent, "binary"));
    }

    const decodedStream = bytesToBinary(streamBytes);
    const extracted = extractTextFromStream(decodedStream).trim();
    if (extracted) streamTexts.push(extracted);
  }

  if (streamTexts.length === 0) {
    const fallbackText = extractTextFromStream(binaryString).trim();
    if (fallbackText) streamTexts.push(fallbackText);
  }

  const pages = streamTexts.map((text, index) => ({
    pageNumber: streamTexts.length === pageCount ? index + 1 : null,
    text: capText(text),
  }));
  const text = capText(pages.map((page) => page.text).join("\n\n").trim());

  return { text, pageCount, metadata, pages };
}
