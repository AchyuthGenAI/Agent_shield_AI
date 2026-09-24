import type { Source } from "@/lib/firewall";

export type ExtractedFile = { text: string; source: Source; detail: string };

function extension(name: string) { return name.split(".").pop()?.toLowerCase() ?? ""; }

export async function extractFile(file: File, progress: (value: string) => void): Promise<ExtractedFile> {
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose a file smaller than 12 MB.");
  const ext = extension(file.name);
  const limit = (text: string, source: Source, detail: string) => {
    if (!text.trim()) throw new Error("No readable text was found. Try a clearer image or a text-based document.");
    if (text.length > 50_000) throw new Error("This file contains more than 50,000 characters. Choose a shorter file.");
    return { text, source, detail };
  };

  if (["txt", "md", "markdown", "html", "htm", "json", "js", "jsx", "ts", "tsx", "py", "csv", "xml", "eml", "log"].includes(ext)) {
    progress("Reading text…");
    const source: Source = ext === "eml" ? "email" : ext === "md" || ext === "markdown" ? "markdown" : ext === "html" || ext === "htm" ? "html" : ext === "json" ? "api" : ["js", "jsx", "ts", "tsx", "py"].includes(ext) ? "code" : "user";
    return limit(await file.text(), source, "Text extracted in your browser");
  }

  if (ext === "docx") {
    progress("Reading Word document…");
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return limit(result.value, "word", "Word text extracted in your browser");
  }

  if (ext === "pdf") {
    progress("Reading PDF pages…");
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    if (document.numPages > 30) throw new Error("This PDF has more than 30 pages. Choose a shorter document.");
    const pages: string[] = [];
    let ocrWorker: Awaited<ReturnType<typeof makeOcrWorker>> | null = null;
    try {
      for (let number = 1; number <= document.numPages; number++) {
        progress(`Reading PDF page ${number} of ${document.numPages}…`);
        const page = await document.getPage(number);
        const textContent = await page.getTextContent();
        let pageText = textContent.items.map(item => "str" in item ? item.str : "").join(" ").trim();
        if (pageText.length < 20) {
          progress(`Scanning image on page ${number}…`);
          ocrWorker ??= await makeOcrWorker();
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = window.document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const canvasContext = canvas.getContext("2d");
          if (!canvasContext) throw new Error("Canvas is unavailable for scanned PDF text.");
          await page.render({ canvas, canvasContext, viewport }).promise;
          pageText = (await ocrWorker.recognize(canvas)).data.text.trim();
        }
        pages.push(`[Page ${number}]\n${pageText}`);
      }
    } finally { await ocrWorker?.terminate(); }
    return limit(pages.join("\n\n"), "pdf", `${document.numPages} PDF ${document.numPages === 1 ? "page" : "pages"} extracted in your browser`);
  }

  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "bmp"].includes(ext)) {
    progress("Reading image text locally…");
    const worker = await makeOcrWorker();
    try { return limit((await worker.recognize(file)).data.text, "image", "Image text read with local OCR"); }
    finally { await worker.terminate(); }
  }

  throw new Error("Unsupported file. Use PDF, DOCX, image, email, code, HTML, Markdown, JSON, or text.");
}

async function makeOcrWorker() {
  const { createWorker } = await import("tesseract.js");
  return createWorker("eng", 1, { workerPath: "/ocr/worker.min.js", langPath: "/ocr", corePath: "/ocr", gzip: true });
}
