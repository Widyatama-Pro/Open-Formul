import type { FormulationResult, Ingredient, Nutrient, Requirement } from "../types";
import { assertExportableResult } from "./exportCsvXlsx";

export type PdfExportMode = "full" | "batch_only";

export interface PdfExportInput {
  readonly recipeName: string;
  readonly mode: PdfExportMode;
  readonly ingredients: readonly Ingredient[];
  readonly nutrientsCatalog: readonly Nutrient[];
  readonly requirement: Requirement;
  readonly result: FormulationResult;
}

function toWinAnsiAscii(text: string): string {
  return text
    .replace(/[–—]/g, "-")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/±/g, "+/-")
    .replace(/×/g, "x")
    .replace(/·/g, "|")
    .replace(/μ/g, "u")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfString(text: string): string {
  return toWinAnsiAscii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatIdr(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `Rp ${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
}

interface DrawLine {
  readonly text: string;
  readonly bold?: boolean;
  readonly size?: number;
  readonly gapAfter?: number;
  readonly rule?: boolean;
}

function paginateLines(lines: readonly DrawLine[]): DrawLine[][] {
  const pages: DrawLine[][] = [];
  let current: DrawLine[] = [];
  let y = 795;

  for (const line of lines) {
    const fontSize = line.size ?? 9;
    const step = fontSize + (line.gapAfter ?? 5);
    if (y - step < 52) {
      pages.push(current);
      current = [];
      y = 795;
    }
    current.push(line);
    y -= step;
  }
  if (current.length > 0 || pages.length === 0) {
    pages.push(current);
  }
  return pages;
}

function renderPageStream(lines: readonly DrawLine[], pageNum: number, totalPages: number): string {
  const ops: string[] = [];
  let y = 795;

  for (const line of lines) {
    const fontKey = line.bold ? "/F2" : "/F1";
    const size = line.size ?? 9;
    if (line.rule) {
      ops.push(
        "0.75 w 0.65 0.72 0.78 RG 44 " +
          (y + 3).toFixed(1) +
          " m 551 " +
          (y + 3).toFixed(1) +
          " l S 0 0 0 rg",
      );
    }
    if (line.text) {
      ops.push(
        `BT ${fontKey} ${size} Tf 44 ${y.toFixed(1)} Td (${escapePdfString(line.text)}) Tj ET`,
      );
    }
    y -= size + (line.gapAfter ?? 5);
  }

  ops.push(
    `BT /F1 8 Tf 44 28 Td (${escapePdfString(
      `OpenFormul (Offline Least-Cost Feed Formulation) | Halaman ${pageNum}/${totalPages}`,
    )}) Tj ET`,
  );
  return ops.join("\n");
}

function assemblePdfDocument(pageStreams: readonly string[]): Uint8Array {
  // Objek:
  // 1 = Catalog, 2 = Pages, 3 = Font F1 (Helvetica), 4 = Font F2 (Helvetica-Bold)
  // Setiap halaman pakai 2 objek: pageObj (5 + 2*i) & contentObj (6 + 2*i)
  const objects: string[] = [];
  const pageIds: number[] = [];

  for (let i = 0; i < pageStreams.length; i += 1) {
    pageIds.push(5 + i * 2);
  }

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj\n`,
  );
  objects.push(
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
  );
  objects.push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
  );

  for (let i = 0; i < pageStreams.length; i += 1) {
    const pageObjId = 5 + i * 2;
    const contentObjId = pageObjId + 1;
    const stream = pageStreams[i] ?? "";
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    );
  }

  const encoder = new TextEncoder();
  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [0];
  let byteOffset = "%PDF-1.4\n".length;

  for (const obj of objects) {
    offsets.push(byteOffset);
    chunks.push(obj);
    byteOffset += encoder.encode(obj).length;
  }

  const xrefStart = byteOffset;
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (let i = 1; i <= objects.length; i += 1) {
    const off = String(offsets[i] ?? 0).padStart(10, "0");
    chunks.push(`${off} 00000 n \n`);
  }
  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  return encoder.encode(chunks.join(""));
}

export function generateFormulationPdf(input: PdfExportInput): Uint8Array {
  assertExportableResult(input.result, {
    requireStrictOptimal: input.mode === "batch_only",
  });

  const { recipeName, mode, ingredients, nutrientsCatalog, requirement, result } = input;
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  const nutMap = new Map(nutrientsCatalog.map((n) => [n.id, n]));
  const batchKg = result.batchSizeKg ?? 100;

  const lines: DrawLine[] = [];

  lines.push({
    text:
      mode === "batch_only"
        ? "OPENFORMUL — LEMBAR TIMBANG BATCH PRODUKSI"
        : "OPENFORMUL — LAPORAN FORMULASI PAKAN LENGKAP",
    bold: true,
    size: 13,
    gapAfter: 6,
  });

  if (result.status === "near_feasible") {
    lines.push({
      text: "PERINGATAN: STATUS NEAR-FEASIBLE (ELASTIK) - SEBAGIAN TARGET NUTRIEN BELUM TERCAPAI PENUH",
      bold: true,
      size: 9,
      gapAfter: 6,
    });
  }

  lines.push({ text: "", rule: true, size: 4, gapAfter: 6 });
  lines.push({ text: `Nama Formula   : ${recipeName}`, bold: true, size: 10 });
  lines.push({
    text: `Standar Ternak : ${requirement.name} (${requirement.phase ?? requirement.species})`,
    size: 9,
  });
  lines.push({
    text: `Basis & Status : ${result.basis === "dry_matter" ? "Bahan Kering (DM)" : "As-Fed"} | Status: ${result.status.toUpperCase()} | Batch: ${batchKg.toFixed(1)} kg`,
    size: 9,
  });
  lines.push({
    text: `Biaya Formula  : ${formatIdr(result.costPerKg)} / kg  |  Total Batch (${batchKg.toFixed(0)} kg): ${formatIdr(result.batchTotalCost)}`,
    bold: true,
    size: 10,
    gapAfter: 8,
  });

  lines.push({
    text: "1. KOMPOSISI BAHAN & TAKARAN TIMBANG AKTUAL",
    bold: true,
    size: 10,
    gapAfter: 4,
  });
  lines.push({ text: "", rule: true, size: 3, gapAfter: 4 });
  lines.push({
    text: "No  Nama Bahan                         Basis%   Timbang%   Berat (kg)    Biaya/kg    Cek",
    bold: true,
    size: 8.5,
  });

  let totalWeight = 0;
  let totalAsFed = 0;
  result.composition.forEach((item, idx) => {
    const ing = ingMap.get(item.ingredientId);
    const activePrice = ing ? (ing.priceOverride ?? ing.pricePerKg) : 0;
    const asFedPct = (item.asFedFraction ?? item.fraction) * 100;
    const weight = item.weightKg ?? (item.asFedFraction ?? item.fraction) * batchKg;
    totalWeight += weight;
    totalAsFed += asFedPct;

    const no = String(idx + 1).padEnd(4, " ");
    const name = truncateText(ing?.name ?? item.ingredientId, 33).padEnd(35, " ");
    const bPct = (item.fraction * 100).toFixed(2).padStart(6, " ");
    const afPct = asFedPct.toFixed(2).padStart(9, " ");
    const wStr = weight.toFixed(2).padStart(11, " ");
    const pStr = formatIdr(activePrice).padStart(12, " ");
    lines.push({
      text: `${no}${name}${bPct}  ${afPct}  ${wStr}  ${pStr}   [  ]`,
      size: 8.5,
      gapAfter: 4,
    });
  });

  lines.push({ text: "", rule: true, size: 3, gapAfter: 4 });
  lines.push({
    text: `TOTAL KOMPOSISI : Basis 100.00% | As-Fed ${totalAsFed.toFixed(2)}% | Total Berat ${totalWeight.toFixed(2)} kg`,
    bold: true,
    size: 9,
    gapAfter: 10,
  });

  if (mode === "full") {
    lines.push({ text: "2. PROFIL NUTRIEN AKTUAL VS TARGET", bold: true, size: 10, gapAfter: 4 });
    lines.push({ text: "", rule: true, size: 3, gapAfter: 4 });
    lines.push({
      text: "Nutrien                       Satuan      Aktual      Min       Max     Status",
      bold: true,
      size: 8.5,
    });

    for (const nr of result.nutrients) {
      const meta = nutMap.get(nr.nutrientId);
      const nName = truncateText(meta?.name ?? nr.nutrientId, 28).padEnd(30, " ");
      const unit = (meta?.unit ?? "%").padEnd(9, " ");
      const act = nr.value.toFixed(2).padStart(8, " ");
      const minS = (nr.min !== undefined ? nr.min.toFixed(2) : "-").padStart(8, " ");
      const maxS = (nr.max !== undefined ? nr.max.toFixed(2) : "-").padStart(8, " ");
      const st = nr.status.toUpperCase().padStart(11, " ");
      lines.push({
        text: `${nName}${unit}${act}  ${minS}  ${maxS}  ${st}`,
        size: 8.5,
        gapAfter: 4,
      });
    }

    lines.push({ text: "", size: 4, gapAfter: 6 });
    lines.push({
      text: "3. ANALISIS EKONOMI (SHADOW PRICE & OPPORTUNITY COST)",
      bold: true,
      size: 10,
      gapAfter: 4,
    });
    lines.push({ text: "", rule: true, size: 3, gapAfter: 4 });

    const bindingNutrients = result.nutrients.filter(
      (n) =>
        n.shadowPrice !== undefined && n.shadowPrice !== null && Math.abs(n.shadowPrice) > 1e-4,
    );
    if (bindingNutrients.length === 0) {
      lines.push({
        text: "Tidak ada kendala nutrien aktif yang mengikat harga bayangan signifikan.",
        size: 8.5,
      });
    } else {
      for (const n of bindingNutrients) {
        const meta = nutMap.get(n.nutrientId);
        lines.push({
          text: `- ${meta?.name ?? n.nutrientId}: Shadow Price ${formatIdr(n.shadowPrice)} / unit kendala`,
          size: 8.5,
        });
      }
    }

    const occ = result.opportunityCosts ?? [];
    if (occ.length > 0) {
      lines.push({
        text: "Opportunity Cost Bahan 0% (Target Harga Masuk):",
        bold: true,
        size: 8.5,
        gapAfter: 3,
      });
      for (const item of occ.slice(0, 8)) {
        const ing = ingMap.get(item.ingredientId);
        lines.push({
          text: `- ${truncateText(ing?.name ?? item.ingredientId, 32)}: Harga skrg ${formatIdr(item.currentPrice)} -> Layak di ${formatIdr(item.opportunityPrice)}`,
          size: 8.5,
        });
      }
    }
  }

  const pages = paginateLines(lines);
  const pageStreams = pages.map((pageLines, idx) =>
    renderPageStream(pageLines, idx + 1, pages.length),
  );
  return assemblePdfDocument(pageStreams);
}
