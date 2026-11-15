import { useCallback, useEffect, useState } from "react";

export interface PwaStatus {
  readonly isOnline: boolean;
  readonly offlineReady: boolean;
  readonly needRefresh: boolean;
  readonly swSupported: boolean;
  readonly applyUpdate: () => void;
}

export function usePwaStatus(): PwaStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const swSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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

  return {
    isOnline,
    offlineReady,
    needRefresh,
    swSupported,
    applyUpdate,
  };
}
