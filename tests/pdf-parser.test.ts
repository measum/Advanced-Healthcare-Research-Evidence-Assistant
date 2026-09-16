import { describe, expect, it } from "vitest";
import { extractPdfText, inspectPdfBytes } from "../lib/pdf-parser";

describe("PDF parser", () => {
  it("extracts text from plain PDF stream", () => {
    const rawPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 45 >>
stream
BT
/F1 12 Tf
(Clinical Trial on GLP-1 Efficacy) Tj
ET
endstream
endobj
trailer
<< /Size 5 /Root 1 0 R >>
%%EOF`;

    const buffer = new TextEncoder().encode(rawPdf);
    const result = extractPdfText(buffer);
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("Clinical Trial on GLP-1 Efficacy");
  });

  it("handles empty or minimal PDF gracefully", () => {
    const rawPdf = "%PDF-1.4 %%EOF";
    const buffer = new TextEncoder().encode(rawPdf);
    const result = extractPdfText(buffer);
    expect(result.pageCount).toBe(1);
    expect(result.text).toBe("");
  });

  it("flags active PDF content for rejection before storage", () => {
    const buffer = new TextEncoder().encode("%PDF-1.4 /JavaScript (alert) /Launch");
    expect(inspectPdfBytes(buffer)).toMatchObject({
      isPdf: true,
      suspiciousFeatures: ["embedded JavaScript", "launch action"],
    });
  });
});
