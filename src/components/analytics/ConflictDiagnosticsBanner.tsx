import { AlertCircle, AlertTriangle } from "lucide-react";
import type { ConflictDiagnostic, FormulationStatus } from "../../types";

export interface ConflictDiagnosticsBannerProps {
  readonly status: FormulationStatus;
  readonly conflicts: readonly ConflictDiagnostic[];
  readonly messages: readonly string[];
}

export function ConflictDiagnosticsBanner({
  status,
  conflicts,
  messages,
}: ConflictDiagnosticsBannerProps) {
  const errors = conflicts.filter((c) => c.severity === "error");
  const warnings = conflicts.filter(
    (c) => c.severity === "warning" && c.code !== "ADVANCE_NULL_DATA",
  );

  if (status !== "infeasible" && status !== "near_feasible" && warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {(status === "infeasible" || errors.length > 0) && (
        <div
          role="alert"
          className="glass-card glass-card-coral rounded-2xl bg-rose-50/75 p-3.5 text-xs text-rose-900 dark:bg-rose-950/45 dark:text-rose-100"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="space-y-1">
              <p className="font-bold">
                Formula Tidak Ditemukan (Infeasible) — Kendala Konflik Terdeteksi
              </p>
              <ul className="list-disc space-y-1 pl-4">
                {errors.map((err, i) => (
                  <li key={`${err.code}-${i}`}>
                    <span>{err.message}</span>
                    {err.suggestion && (
                      <span className="block text-[11px] text-rose-700 dark:text-rose-300">
                        Saran: {err.suggestion}
                      </span>
                    )}
                  </li>
                ))}
                {errors.length === 0 && messages.map((msg, i) => <li key={`msg-${i}`}>{msg}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {(status === "near_feasible" || warnings.length > 0) && status !== "infeasible" && (
        <div
          role="status"
          className="glass-card glass-card-amber rounded-2xl bg-amber-50/75 p-3.5 text-xs text-amber-900 dark:bg-amber-950/45 dark:text-amber-100"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-bold">
                {status === "near_feasible"
                  ? "Terpenuhi Sebagian (Near-Feasible / Mode Relaksasi Elastik)"
                  : "Peringatan Batasan Formulasi"}
              </p>
              <ul className="list-disc space-y-1 pl-4">
                {warnings.map((w, i) => (
                  <li key={`${w.code}-${i}`}>
                    <span>{w.message}</span>
                    {w.suggestion && (
                      <span className="block text-[11px] opacity-85">Saran: {w.suggestion}</span>
                    )}
                  </li>
                ))}
                {warnings.length === 0 && messages.map((m, i) => <li key={`warn-m-${i}`}>{m}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
