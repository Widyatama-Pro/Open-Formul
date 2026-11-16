import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    parts.push(String.fromCharCode(...chunk));
  }
  return btoa(parts.join(""));
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca data unduhan."));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        resolve(new Uint8Array(0));
      }
    };
    reader.readAsArrayBuffer(blob);
  });
}

function getExtensionFromFilename(filename: string): string {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx <= 0 || dotIdx === filename.length - 1) return "*";
  return filename.slice(dotIdx + 1).toLowerCase();
}

async function saveViaTauri(bytes: Uint8Array, filename: string): Promise<void> {
  const ext = getExtensionFromFilename(filename);
  const targetPath = await save({
    defaultPath: filename,
    filters:
      ext === "*"
        ? [{ name: "All Files", extensions: ["*"] }]
        : [{ name: `${ext.toUpperCase()} File`, extensions: [ext] }],
  });
  if (!targetPath) return;
  await writeFile(targetPath, bytes);
}

async function saveViaCapacitor(bytes: Uint8Array, filename: string): Promise<void> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  await Filesystem.writeFile({
    path: safeName,
    data: bytesToBase64(bytes),
    directory: Directory.Cache,
    recursive: true,
  });
  const uriResult = await Filesystem.getUri({
    directory: Directory.Cache,
    path: safeName,
  });
  await Share.share({
    title: filename,
    text: `OpenFormul: ${filename}`,
    url: uriResult.uri,
    dialogTitle: filename,
  });
}

function triggerBrowserBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

export function triggerFileDownload(blob: Blob, filename: string): void {
  if (isTauriEnvironment()) {
    void blobToBytes(blob).then((bytes) => saveViaTauri(bytes, filename));
    return;
  }

  if (Capacitor.isNativePlatform()) {
    void blobToBytes(blob).then((bytes) => saveViaCapacitor(bytes, filename));
    return;
  }

  triggerBrowserBlobDownload(blob, filename);
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  triggerFileDownload(blob, filename);
}

export function downloadBinaryFile(bytes: Uint8Array, filename: string, mimeType: string): void {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: mimeType });
  triggerFileDownload(blob, filename);
}
