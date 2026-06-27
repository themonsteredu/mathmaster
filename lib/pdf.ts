"use client";

// PDF ↔ 이미지 변환 도우미 (전부 사용자 브라우저에서 처리 — 서버/요금 없음)
import * as pdfjsLib from "pdfjs-dist";
import { jsPDF } from "jspdf";

// pdf.js 작업자(worker)는 같은 버전 CDN에서 로드 (사용자 브라우저에서 동작)
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

// PDF 페이지 수만 빠르게 확인 (요금 안내용)
export async function pdfPageCount(file: File): Promise<number> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  return pdf.numPages;
}

// PDF 파일 → 페이지별 이미지(dataURL[]) 로 렌더링
export async function pdfToImages(file: File, scale = 2): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    out.push(canvas.toDataURL("image/jpeg", 0.92));
  }
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 이미지(dataURL[]) → 한 개의 PDF Blob 으로 합치기 (각 페이지는 A4, 비율 유지)
export async function imagesToPdfBlob(images: string[]): Promise<Blob> {
  const A4W = 595.28; // pt
  const A4H = 841.89;
  let doc: jsPDF | null = null;
  for (const src of images) {
    const img = await loadImage(src);
    const landscape = img.width > img.height;
    const pw = landscape ? A4H : A4W;
    const ph = landscape ? A4W : A4H;
    if (!doc) doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
    else doc.addPage("a4", landscape ? "landscape" : "portrait");
    // 여백 18pt 두고 비율 맞춰 가운데 배치
    const m = 18;
    const maxW = pw - m * 2;
    const maxH = ph - m * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    doc.addImage(src, "JPEG", (pw - w) / 2, (ph - h) / 2, w, h);
  }
  if (!doc) throw new Error("페이지가 없습니다.");
  return doc.output("blob");
}
