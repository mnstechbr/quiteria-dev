"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { TableWithStatus } from "@/types/table";

type TableQrModalProps = {
  table: TableWithStatus;
  onClose: () => void;
  onRegenerateQr?: (table: TableWithStatus) => void;
  isRegenerating?: boolean;
};

type TableQrActionsProps = {
  table: TableWithStatus;
  onOpenQr: (table: TableWithStatus) => void;
  onRegenerateQr?: (table: TableWithStatus) => void;
  isRegenerating?: boolean;
};

const QR_VERSION = 5;
const QR_SIZE = 21 + (QR_VERSION - 1) * 4;
const QR_DATA_CODEWORDS = 108;
const QR_ECC_CODEWORDS = 26;
const QR_MAX_BYTES = 106;
const QR_QUIET_ZONE = 4;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function getCustomerQrUrl(qrToken: string) {
  const path = `/m/${qrToken}`;

  if (typeof window === "undefined") {
    return path;
  }

  return `${window.location.origin}${path}`;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

const GF_EXP: number[] = [];
const GF_LOG: number[] = [];

function initializeGaloisField() {
  if (GF_EXP.length > 0) return;

  let value = 1;

  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = value;
    GF_LOG[value] = i;
    value <<= 1;

    if (value & 0x100) {
      value ^= 0x11d;
    }
  }

  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
}

function gfMultiply(firstValue: number, secondValue: number) {
  initializeGaloisField();

  if (firstValue === 0 || secondValue === 0) return 0;

  return GF_EXP[GF_LOG[firstValue] + GF_LOG[secondValue]];
}

function polynomialMultiply(firstPolynomial: number[], secondPolynomial: number[]) {
  const result = Array(firstPolynomial.length + secondPolynomial.length - 1).fill(0);

  firstPolynomial.forEach((firstValue, firstIndex) => {
    secondPolynomial.forEach((secondValue, secondIndex) => {
      result[firstIndex + secondIndex] ^= gfMultiply(firstValue, secondValue);
    });
  });

  return result;
}

function createReedSolomonGenerator(degree: number) {
  initializeGaloisField();

  let generator = [1];

  for (let i = 0; i < degree; i += 1) {
    generator = polynomialMultiply(generator, [1, GF_EXP[i]]);
  }

  return generator;
}

function createErrorCorrectionCodewords(dataCodewords: number[], degree: number) {
  const generator = createReedSolomonGenerator(degree);
  const message = [...dataCodewords, ...Array(degree).fill(0)];

  for (let i = 0; i < dataCodewords.length; i += 1) {
    const coefficient = message[i];

    if (coefficient === 0) continue;

    for (let j = 0; j < generator.length; j += 1) {
      message[i + j] ^= gfMultiply(generator[j], coefficient);
    }
  }

  return message.slice(dataCodewords.length);
}

function createDataCodewords(value: string) {
  const encoder = new TextEncoder();
  const encodedBytes = Array.from(encoder.encode(value));

  if (encodedBytes.length > QR_MAX_BYTES) {
    throw new Error(
      "O endereço do QR Code ficou longo demais. Use um domínio menor para gerar o QR visual.",
    );
  }

  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, encodedBytes.length, 8);

  encodedBytes.forEach((byte) => appendBits(bits, byte, 8));

  const maxBits = QR_DATA_CODEWORDS * 8;
  const terminatorLength = Math.min(4, maxBits - bits.length);
  appendBits(bits, 0, terminatorLength);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords: number[] = [];

  for (let i = 0; i < bits.length; i += 8) {
    let codeword = 0;

    for (let j = 0; j < 8; j += 1) {
      codeword = (codeword << 1) | bits[i + j];
    }

    codewords.push(codeword);
  }

  const padBytes = [0xec, 0x11];
  let padIndex = 0;

  while (codewords.length < QR_DATA_CODEWORDS) {
    codewords.push(padBytes[padIndex % 2]);
    padIndex += 1;
  }

  return codewords;
}

function getFormatBits() {
  const errorCorrectionLevelBits = 1;
  const maskPattern = 0;
  const formatData = (errorCorrectionLevelBits << 3) | maskPattern;
  let remainder = formatData;

  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }

  return ((formatData << 10) | remainder) ^ 0x5412;
}

function createEmptyMatrix() {
  return {
    modules: Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(false)),
    reserved: Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(false)),
  };
}

function setModule(
  modules: boolean[][],
  reserved: boolean[][],
  x: number,
  y: number,
  value: boolean,
  isReserved = true,
) {
  if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) return;

  modules[y][x] = value;

  if (isReserved) {
    reserved[y][x] = true;
  }
}

function drawFinderPattern(modules: boolean[][], reserved: boolean[][], x: number, y: number) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;

      if (xx < 0 || yy < 0 || xx >= QR_SIZE || yy >= QR_SIZE) continue;

      const isDark =
        dx >= 0 &&
        dx <= 6 &&
        dy >= 0 &&
        dy <= 6 &&
        (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));

      setModule(modules, reserved, xx, yy, isDark);
    }
  }
}

function drawAlignmentPattern(modules: boolean[][], reserved: boolean[][], centerX: number, centerY: number) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(modules, reserved, centerX + dx, centerY + dy, distance === 2 || distance === 0);
    }
  }
}

function drawFunctionPatterns(modules: boolean[][], reserved: boolean[][]) {
  drawFinderPattern(modules, reserved, 0, 0);
  drawFinderPattern(modules, reserved, QR_SIZE - 7, 0);
  drawFinderPattern(modules, reserved, 0, QR_SIZE - 7);
  drawAlignmentPattern(modules, reserved, 30, 30);

  for (let i = 8; i < QR_SIZE - 8; i += 1) {
    const value = i % 2 === 0;
    setModule(modules, reserved, 6, i, value);
    setModule(modules, reserved, i, 6, value);
  }

  setModule(modules, reserved, 8, QR_VERSION * 4 + 9, true);

  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      setModule(modules, reserved, 8, i, false);
      setModule(modules, reserved, i, 8, false);
    }
  }

  for (let i = 0; i < 8; i += 1) {
    setModule(modules, reserved, QR_SIZE - 1 - i, 8, false);
  }

  for (let i = 0; i < 7; i += 1) {
    setModule(modules, reserved, 8, QR_SIZE - 1 - i, false);
  }
}

function drawFormatBits(modules: boolean[][], reserved: boolean[][]) {
  const bits = getFormatBits();
  const getBit = (index: number) => ((bits >>> index) & 1) !== 0;

  for (let i = 0; i <= 5; i += 1) setModule(modules, reserved, 8, i, getBit(i));
  setModule(modules, reserved, 8, 7, getBit(6));
  setModule(modules, reserved, 8, 8, getBit(7));
  setModule(modules, reserved, 7, 8, getBit(8));
  for (let i = 9; i < 15; i += 1) setModule(modules, reserved, 14 - i, 8, getBit(i));

  for (let i = 0; i < 8; i += 1) setModule(modules, reserved, QR_SIZE - 1 - i, 8, getBit(i));
  for (let i = 8; i < 15; i += 1) setModule(modules, reserved, 8, QR_SIZE - 15 + i, getBit(i));

  setModule(modules, reserved, 8, QR_SIZE - 8, true);
}

function drawCodewords(modules: boolean[][], reserved: boolean[][], codewords: number[]) {
  const bits = codewords.flatMap((codeword) =>
    Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1),
  );

  let bitIndex = 0;
  let isMovingUp = true;

  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;

    for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
      const y = isMovingUp ? QR_SIZE - 1 - vertical : vertical;

      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const x = right - columnOffset;

        if (reserved[y][x]) continue;

        let bit = bitIndex < bits.length ? bits[bitIndex] : 0;
        bitIndex += 1;

        if ((x + y) % 2 === 0) {
          bit ^= 1;
        }

        setModule(modules, reserved, x, y, bit === 1, false);
      }
    }

    isMovingUp = !isMovingUp;
  }
}

function createQrMatrix(value: string) {
  const { modules, reserved } = createEmptyMatrix();
  const dataCodewords = createDataCodewords(value);
  const errorCorrectionCodewords = createErrorCorrectionCodewords(dataCodewords, QR_ECC_CODEWORDS);

  drawFunctionPatterns(modules, reserved);
  drawCodewords(modules, reserved, [...dataCodewords, ...errorCorrectionCodewords]);
  drawFormatBits(modules, reserved);

  return modules;
}

function createQrSvgString(value: string, title?: string) {
  const modules = createQrMatrix(value);
  const sizeWithQuietZone = QR_SIZE + QR_QUIET_ZONE * 2;
  const darkPath = modules
    .flatMap((row, y) =>
      row
        .map((isDark, x) => (isDark ? `M${x + QR_QUIET_ZONE},${y + QR_QUIET_ZONE}h1v1h-1z` : ""))
        .filter(Boolean),
    )
    .join(" ");

  const safeTitle = title ? `<title>${escapeHtml(title)}</title>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizeWithQuietZone} ${sizeWithQuietZone}" shape-rendering="crispEdges">${safeTitle}<path fill="#ffffff" d="M0,0h${sizeWithQuietZone}v${sizeWithQuietZone}h-${sizeWithQuietZone}z"/><path fill="#000000" d="${darkPath}"/></svg>`;
}

function downloadFile(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function downloadQrPng(tableName: string, qrUrl: string) {
  const svg = createQrSvgString(qrUrl, tableName);
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível gerar a imagem PNG do QR Code."));
    image.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  const size = 1200;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");

  if (!context) {
    URL.revokeObjectURL(imageUrl);
    throw new Error("Não foi possível gerar o PNG do QR Code.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, size, size);

  URL.revokeObjectURL(imageUrl);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

  if (!blob) {
    throw new Error("Não foi possível baixar o QR Code em PNG.");
  }

  const filename = `qr-${sanitizeFilename(tableName || "mesa")}.png`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function printQrCode(tableName: string, qrUrl: string) {
  const svg = createQrSvgString(qrUrl, tableName);
  const safeTableName = escapeHtml(tableName);
  const safeQrUrl = escapeHtml(qrUrl);
  const printWindow = window.open("", "_blank", "width=480,height=720");

  if (!printWindow) {
    return;
  }

  printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>QR Code - ${safeTableName}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; color: #111827; background: #fff; }
    main { width: min(92vw, 420px); text-align: center; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0 0 20px; font-size: 13px; color: #4b5563; word-break: break-all; }
    svg { width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 18px; }
    @media print { body { min-height: auto; } main { width: 100%; } button { display: none; } }
  </style>
</head>
<body>
  <main>
    <h1>${safeTableName}</h1>
    <p>${safeQrUrl}</p>
    ${svg}
  </main>
  <script>window.onload = () => { window.focus(); window.print(); };</script>
</body>
</html>`);
  printWindow.document.close();
}

export function TableQrPreview({ value, title }: { value: string; title: string }) {
  const svg = useMemo(() => createQrSvgString(value, title), [title, value]);

  return (
    <div
      className="mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl border border-zinc-200 bg-white p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function TableQrActions({
  table,
  onOpenQr,
  onRegenerateQr,
  isRegenerating = false,
}: TableQrActionsProps) {
  const hasActiveSession = Boolean(table.active_session_id);

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onOpenQr(table)}
        className="min-h-11 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-100 transition active:scale-[0.99]"
      >
        Ver QR Code
      </button>

      <button
        type="button"
        disabled={!onRegenerateQr || hasActiveSession || isRegenerating}
        onClick={() => onRegenerateQr?.(table)}
        title={hasActiveSession ? "Feche a mesa antes de gerar um novo QR Code." : undefined}
        className="min-h-11 rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] px-3 py-2 text-xs font-black text-[var(--q-text)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isRegenerating ? "Gerando..." : "Novo QR"}
      </button>
    </div>
  );
}

export function TableQrModal({
  table,
  onClose,
  onRegenerateQr,
  isRegenerating = false,
}: TableQrModalProps) {
  const qrUrl = useMemo(() => getCustomerQrUrl(table.qr_token), [table.qr_token]);
  const hasActiveSession = Boolean(table.active_session_id);

  async function handleDownloadPng() {
    try {
      await downloadQrPng(table.name, qrUrl);
    } catch {
      const svg = createQrSvgString(qrUrl, table.name);
      downloadFile(`qr-${sanitizeFilename(table.name || "mesa")}.svg`, svg, "image/svg+xml;charset=utf-8");
    }
  }

  function handleDownloadSvg() {
    const svg = createQrSvgString(qrUrl, table.name);
    downloadFile(`qr-${sanitizeFilename(table.name || "mesa")}.svg`, svg, "image/svg+xml;charset=utf-8");
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-[var(--q-bg-outer)]/70 px-3 pb-3 pt-12 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-[color:var(--q-border)] bg-[var(--q-bg)] p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">QR Code da mesa</p>
            <h2 className="mt-1 break-words text-2xl font-black text-white">{table.name}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] text-lg font-black text-[var(--q-text-soft)]"
            aria-label="Fechar QR Code"
          >
            ×
          </button>
        </div>

        <div className="mt-5 rounded-[2rem] bg-white p-4">
          <TableQrPreview value={qrUrl} title={table.name} />
        </div>

        <div className="mt-4 rounded-3xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--q-dim)]">Link do cardápio</p>
          <p className="mt-2 break-all text-sm text-[var(--q-text)]">{qrUrl}</p>
        </div>

        {hasActiveSession && (
          <p className="mt-3 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-xs font-semibold text-yellow-100">
            Esta mesa possui sessão ativa. Feche a mesa antes de gerar um novo QR Code.
          </p>
        )}

        <div className="mt-4 grid gap-2">
          <Button type="button" onClick={handleDownloadPng} className="min-h-12 w-full text-sm font-black">
            Baixar PNG
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="min-h-12 rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] px-4 py-3 text-sm font-black text-[var(--q-text)]"
            >
              Baixar SVG
            </button>

            <button
              type="button"
              onClick={() => printQrCode(table.name, qrUrl)}
              className="min-h-12 rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] px-4 py-3 text-sm font-black text-[var(--q-text)]"
            >
              Imprimir
            </button>
          </div>

          {onRegenerateQr && (
            <button
              type="button"
              disabled={hasActiveSession || isRegenerating}
              onClick={() => onRegenerateQr(table)}
              className="min-h-12 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-black text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isRegenerating ? "Gerando novo QR..." : "Gerar novo QR desta mesa"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
