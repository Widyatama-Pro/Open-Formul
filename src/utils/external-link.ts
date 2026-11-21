import type { MouseEvent } from "react";

/** Memeriksa apakah aplikasi sedang berjalan di dalam shell desktop Tauri v2. */
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Membuka URL eksternal (https:// / http://) di browser bawaan sistem operasi:
 * - Pada Desktop .exe Tauri v2: memakai `@tauri-apps/plugin-opener` (`openUrl`)
 * - Pada browser / PWA / Android: fallback ke `window.open(..., "_blank", "noopener,noreferrer")`
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;

  if (isTauriRuntime()) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    } catch {
      // Fallback jika plugin opener tidak tersedia pada lingkungan preview/test
    }
  }

  if (typeof window !== "undefined" && typeof window.open === "function") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Handler klik tautan eksternal agar di Tauri Desktop tidak ditelan WebView2. */
export function handleExternalLinkClick(event: MouseEvent<HTMLAnchorElement>, url: string): void {
  if (!isTauriRuntime()) return;
  event.preventDefault();
  void openExternalUrl(url);
}
