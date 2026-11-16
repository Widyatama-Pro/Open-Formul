import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export type PwaPlatformHint = "android" | "ios" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: readonly string[];
  readonly userChoice: Promise<{
    readonly outcome: "accepted" | "dismissed";
    readonly platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaStatus {
  readonly isOnline: boolean;
  readonly offlineReady: boolean;
  readonly needRefresh: boolean;
  readonly swSupported: boolean;
  readonly canInstall: boolean;
  readonly isInstalled: boolean;
  readonly isNativeApp: boolean;
  readonly platformHint: PwaPlatformHint;
  readonly applyUpdate: () => void;
  readonly installApp: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

function detectNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || Capacitor.isNativePlatform();
}

function detectPlatformHint(): PwaPlatformHint {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function detectStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  if (detectNativeShell()) return true;
  const mediaMatch =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    typeof navigator !== "undefined" &&
    Boolean((navigator as { readonly standalone?: boolean }).standalone);
  return mediaMatch || iosStandalone;
}

export function usePwaStatus(): PwaStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandaloneMode());
  const [isNativeApp] = useState<boolean>(() => detectNativeShell());
  const [platformHint] = useState<PwaPlatformHint>(() => detectPlatformHint());

  const swSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!swSupported) return;
    let active = true;

    const attachRegistration = (reg: ServiceWorkerRegistration | undefined) => {
      if (!active || !reg) return;
      if (reg.active) {
        setOfflineReady(true);
      }
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setNeedRefresh(true);
      }
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (!active) return;
          if (installing.state === "installed") {
            if (navigator.serviceWorker.controller) {
              setWaitingWorker(reg.waiting ?? installing);
              setNeedRefresh(true);
            } else {
              setOfflineReady(true);
            }
          }
        });
      });
    };

    void navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        attachRegistration(reg);
        return navigator.serviceWorker.ready;
      })
      .then((readyReg) => {
        if (!active) return;
        if (readyReg.active) {
          setOfflineReady(true);
        }
      })
      .catch(() => {
        // Service Worker mungkin diblokir di mode privat atau lingkungan uji
      });

    return () => {
      active = false;
    };
  }, [swSupported]);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, [waitingWorker]);

  const installApp = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!installPromptEvent) {
      return "unavailable";
    }
    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setInstallPromptEvent(null);
      }
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, [installPromptEvent]);

  return {
    isOnline,
    offlineReady: isNativeApp ? true : offlineReady,
    needRefresh,
    swSupported,
    canInstall: installPromptEvent !== null && !isInstalled,
    isInstalled,
    isNativeApp,
    platformHint,
    applyUpdate,
    installApp,
  };
}
