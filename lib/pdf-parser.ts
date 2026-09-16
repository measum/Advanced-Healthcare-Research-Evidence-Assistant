import { inflateSync } from "node:zlib";

export type ExtractedPdf = {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
};

function decodePdfString(raw: string): string {
  return raw
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
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
  // Match Tj operator: (string) Tj
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = tjRegex.exec(streamData)) !== null) {
    textChunks.push(decodePdfString(match[1]));
  }

  // Match TJ operator: [ (str1) 20 (str2) ] TJ
  const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(streamData)) !== null) {
    const inner = match[1];
    const strRegex = /\(([^)]*)\)/g;
    let strMatch: RegExpExecArray | null;
    let combined = "";
    while ((strMatch = strRegex.exec(inner)) !== null) {
      combined += decodePdfString(strMatch[1]);
    }
    if (combined) textChunks.push(combined);
  }

  return textChunks.join(" ");
}

export function extractPdfText(buffer: ArrayBuffer | Uint8Array): ExtractedPdf {
  const uint8 = buffer instanceof Uint8Array
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  const binaryString = Array.from(uint8, (b) => String.fromCharCode(b)).join("");

  const pageMatches = binaryString.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;

  // Extract metadata from Info dictionary if present
  const metadata: ExtractedPdf["metadata"] = {};
  const titleMatch = binaryString.match(/\/Title\s*\(([^)]+)\)/);
  if (titleMatch) metadata.title = decodePdfString(titleMatch[1]);
  const authorMatch = binaryString.match(/\/Author\s*\(([^)]+)\)/);
  if (authorMatch) metadata.author = decodePdfString(authorMatch[1]);

  const allText: string[] = [];

  // Look for uncompressed / compressed streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch: RegExpExecArray | null;

  while ((streamMatch = streamRegex.exec(binaryString)) !== null) {
    const rawContent = streamMatch[1];
    const startIndex = streamMatch.index;
    const precedingHeader = binaryString.slice(Math.max(0, startIndex - 300), startIndex);

    let streamBytes: Uint8Array;
    if (precedingHeader.includes("/FlateDecode")) {
      try {
        const streamBuffer = Buffer.from(rawContent, "binary");
        const decompressed = inflateSync(streamBuffer);
        streamBytes = new Uint8Array(decompressed);
      } catch {
        streamBytes = new Uint8Array(Buffer.from(rawContent, "binary"));
      }
    } else {
      streamBytes = new Uint8Array(Buffer.from(rawContent, "binary"));
    }

    const decodedStream = Array.from(streamBytes, (b) => String.fromCharCode(b)).join("");
    const extracted = extractTextFromStream(decodedStream);
    if (extracted.trim()) {
      allText.push(extracted.trim());
    }
  }

  // If no streams matched, search for direct Tj occurrences
  if (allText.length === 0) {
    const fallbackText = extractTextFromStream(binaryString);
    if (fallbackText.trim()) {
      allText.push(fallbackText.trim());
    }
  }

  return {
    text: allText.join("\n\n").trim(),
    pageCount,
    metadata,
  };
}
