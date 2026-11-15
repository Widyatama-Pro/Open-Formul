import type { LpModel, LpTerm } from "./types";

const EPS = 1e-12;
const MAX_LINE_LEN = 180;

function formatLpNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid non-finite LP numeric literal: ${String(value)}`);
  }
  const normalized = Object.is(value, -0) || Math.abs(value) <= EPS ? 0 : value;
  return normalized.toString();
}

function formatLinearTerms(terms: readonly LpTerm[], fallbackVarName: string): readonly string[] {
  const nonZero = terms.filter((t) => Math.abs(t.coeff) > EPS);
  if (nonZero.length === 0) {
    return [`0 ${fallbackVarName}`];
  }

  const lines: string[] = [];
  let current = "";

  nonZero.forEach((term, index) => {
    const absCoeff = Math.abs(term.coeff);
    const sign = term.coeff < 0 ? (index === 0 ? "-" : " - ") : index === 0 ? "" : " + ";
    const coeffStr = Math.abs(absCoeff - 1) <= EPS ? "" : `${formatLpNumber(absCoeff)} `;
    const fragment = `${sign}${coeffStr}${term.varName}`;

    if (current.length > 0 && current.length + fragment.length > MAX_LINE_LEN) {
      lines.push(current);
      current = ` ${fragment.trimStart()}`;
    } else {
      current += fragment;
    }
  });

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

export function toLpString(model: LpModel): string {
  const fallbackVar = model.variables[0]?.varName ?? "x0";
  const lines: string[] = [];

  lines.push("Minimize");
  const objTerms: LpTerm[] = model.variables.map((v) => ({
    varName: v.varName,
    coeff: v.objectiveCoeff,
  }));
  const objLines = formatLinearTerms(objTerms, fallbackVar);
  objLines.forEach((line, idx) => {
    lines.push(idx === 0 ? ` obj: ${line}` : `      ${line}`);
  });

  lines.push("Subject To");
  for (const row of model.rows) {
    const lhsLines = formatLinearTerms(row.terms, fallbackVar);
    const rhsStr = formatLpNumber(row.rhs);
    lhsLines.forEach((lhsLine, idx) => {
      const prefix = idx === 0 ? ` ${row.name}: ` : "      ";
      const suffix = idx === lhsLines.length - 1 ? ` ${row.sense} ${rhsStr}` : "";
      lines.push(`${prefix}${lhsLine}${suffix}`);
    });
  }

  lines.push("Bounds");
  for (const v of model.variables) {
    const lowerStr = formatLpNumber(v.lower);
    if (v.upper === null) {
      lines.push(` ${lowerStr} <= ${v.varName}`);
    } else {
      const upperStr = formatLpNumber(v.upper);
      lines.push(` ${lowerStr} <= ${v.varName} <= ${upperStr}`);
    }
  }

  lines.push("End");
  return `${lines.join("\n")}\n`;
}
