import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { NutrientTargetsPanel } from "../../src/components/formulation/NutrientTargetsPanel";
import { computeNutrientProximityMeter } from "../../src/components/formulation/nutrient-proximity";
import { DesktopSidebar } from "../../src/components/layout/DesktopSidebar";
import { DEFAULT_CONFIG, MOCK_NUTRIENTS, MOCK_REQUIREMENTS } from "../../src/data/mock-state";
import { THEME_STORAGE_KEYS, ThemeProvider } from "../../src/theme";
import type { NutrientResult } from "../../src/types";

describe("Revisi 4 — Cutout Sidebar Flush, Kontras Header Light/Dark, Progress Bar Target 100%/Over, Seleksi Teks Solid & Hapus Subjudul", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
    document.documentElement.removeAttribute("data-ui-enhancer");
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("Item 1 (DesktopSidebar): saat UI Enhancer OFF, nav memakai px-0 & tombol aktif memakai nav-liquid-cutout menyatu tanpa rounded-2xl border", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiEnhancer, "false");

    const { container } = render(
      <ThemeProvider>
        <DesktopSidebar
          route="formulation"
          onNavigate={vi.fn()}
          language="id"
          expanded
          onToggleExpanded={vi.fn()}
        />
      </ThemeProvider>,
    );

    const nav = screen.getByRole("navigation", { name: "Menu modul" });
    expect(nav.className).toContain("px-0");

    const activeBtn = screen.getByRole("button", { name: "Formulasi Ransum" });
    expect(activeBtn.className).toContain("rounded-none");
    expect(activeBtn.className).not.toContain("rounded-2xl");

    const cutout = container.querySelector(".nav-liquid-cutout");
    expect(cutout).not.toBeNull();
  });

  it("Item 2 (AppShell Header): tombol utilitas header kontras pada tema Standard (!uiEnhancer) baik Light maupun Dark dan menggunakan acrylic saat UI Enhancer aktif", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiEnhancer, "false");
    window.localStorage.setItem(THEME_STORAGE_KEYS.mode, "light");

    const { container, unmount } = render(<App />);

    const chromeCapsule = container.querySelector('[data-header-utility-capsule="chrome"]');
    expect(chromeCapsule).not.toBeNull();
    expect(chromeCapsule?.className).toContain("bg-[var(--shell-chrome-btn-bg)]");

    const langBtn = within(chromeCapsule as HTMLElement).getByRole("button", {
      name: /Ganti bahasa ke English/i,
    });
    const themeBtn = within(chromeCapsule as HTMLElement).getByRole("button", {
      name: /Mode gelap/i,
    });
    const paletteBtn = within(chromeCapsule as HTMLElement).getByRole("button", {
      name: /Tema & UI Enhancer/i,
    });

    expect(langBtn.className).toContain("text-[var(--shell-chrome-fg)]");
    expect(themeBtn.className).toContain("text-[var(--shell-chrome-fg)]");
    expect(paletteBtn.className).toContain("text-[var(--shell-chrome-fg)]");

    unmount();

    window.localStorage.setItem(THEME_STORAGE_KEYS.uiEnhancer, "true");
    const { container: containerAcrylic } = render(<App />);
    const acrylicCapsule = containerAcrylic.querySelector(
      '[data-header-utility-capsule="acrylic"]',
    );
    expect(acrylicCapsule).not.toBeNull();
    expect(acrylicCapsule?.className).toContain("acrylic-control-capsule");
  });

  it("Item 3 (computeNutrientProximityMeter & NutrientTargetsPanel): tepat target = 100% (hijau exact), kurang atau over mengurangi bar < 100% dan over tidak berwarna hijau", () => {
    // Mode 1 Angka — Tepat Target
    const exactSingle = computeNutrientProximityMeter({
      actual: 0.38,
      min: 0.38,
      max: undefined,
      singleMode: true,
      singleTarget: 0.38,
      isUpperOnly: false,
      status: "met",
    });
    expect(exactSingle).toEqual({ pct: 100, tone: "exact", isOver: false });

    // Mode 1 Angka — Sedikit Over (contoh Ca 0,46 vs Target 0,45)
    const slightOver = computeNutrientProximityMeter({
      actual: 0.46,
      min: 0.45,
      max: undefined,
      singleMode: true,
      singleTarget: 0.45,
      isUpperOnly: false,
      status: "met",
    });
    expect(slightOver.pct).toBeLessThan(100);
    expect(slightOver.pct).toBeGreaterThan(95);
    expect(slightOver.tone).toBe("over");
    expect(slightOver.isOver).toBe(true);

    // Mode 1 Angka — Over Besar (0,675 vs Target 0,45 -> deviasi 50% -> bar ~50%)
    const bigOver = computeNutrientProximityMeter({
      actual: 0.675,
      min: 0.45,
      max: undefined,
      singleMode: true,
      singleTarget: 0.45,
      isUpperOnly: false,
      status: "met",
    });
    expect(Math.round(bigOver.pct)).toBe(50);
    expect(bigOver.tone).toBe("over");

    // Mode 1 Angka — Over Ekstrem (>= 2x Target -> bar 0%)
    const extremeOver = computeNutrientProximityMeter({
      actual: 0.9,
      min: 0.45,
      max: undefined,
      singleMode: true,
      singleTarget: 0.45,
      isUpperOnly: false,
      status: "met",
    });
    expect(extremeOver.pct).toBe(0);
    expect(extremeOver.tone).toBe("over");

    // Mode 1 Angka — Kurang dari Target (0,30 vs Target 0,45 -> alert merah < 100%)
    const underSingle = computeNutrientProximityMeter({
      actual: 0.3,
      min: 0.45,
      max: undefined,
      singleMode: true,
      singleTarget: 0.45,
      isUpperOnly: false,
      status: "below_min",
    });
    expect(underSingle.pct).toBeLessThan(100);
    expect(underSingle.tone).toBe("alert");
    expect(underSingle.isOver).toBe(false);

    // Mode 1 Angka — Batas Maksimal SK (<= 5): patuh = 100%, melewati (> 5) = berkurang + alert
    expect(
      computeNutrientProximityMeter({
        actual: 3.5,
        min: undefined,
        max: 5,
        singleMode: true,
        singleTarget: 5,
        isUpperOnly: true,
        status: "met",
      }),
    ).toEqual({ pct: 100, tone: "exact", isOver: false });
    expect(
      computeNutrientProximityMeter({
        actual: 6,
        min: undefined,
        max: 5,
        singleMode: true,
        singleTarget: 5,
        isUpperOnly: true,
        status: "above_max",
      }),
    ).toEqual({ pct: 80, tone: "alert", isOver: true });

    // Mode Rentang (21–23): di dalam rentang = 100%, melewati max 23 ke 25,3 = ~90% alert
    expect(
      computeNutrientProximityMeter({
        actual: 22,
        min: 21,
        max: 23,
        singleMode: false,
        singleTarget: 22,
        isUpperOnly: false,
        status: "met",
      }),
    ).toEqual({ pct: 100, tone: "exact", isOver: false });
    const overRange = computeNutrientProximityMeter({
      actual: 25.3,
      min: 21,
      max: 23,
      singleMode: false,
      singleTarget: 22,
      isUpperOnly: false,
      status: "above_max",
    });
    expect(Math.round(overRange.pct)).toBe(90);
    expect(overRange.tone).toBe("alert");
    expect(overRange.isOver).toBe(true);

    // Render DOM NutrientTargetsPanel dalam Mode 1 Angka: Ca tepat & P over
    const req = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        { nutrientId: "ca", min: 0.45, max: 0.9, idealTarget: 0.45, enabled: true },
        { nutrientId: "p", min: 0.38, max: 0.7, idealTarget: 0.38, enabled: true },
      ],
    };
    const nutrientResults: readonly NutrientResult[] = [
      { nutrientId: "ca", value: 0.45, min: 0.45, max: 0.9, status: "met" },
      { nutrientId: "p", value: 0.57, min: 0.38, max: 0.7, status: "met" },
    ];

    const { container } = render(
      <NutrientTargetsPanel
        requirement={req}
        allNutrients={MOCK_NUTRIENTS}
        config={{ ...DEFAULT_CONFIG, targetInputMode: "single" }}
        activeBasis="as_fed"
        targetInputMode="single"
        enableAdvance={false}
        enableDigestible={false}
        onToggleDigestible={vi.fn()}
        nutrientResults={nutrientResults}
        conflicts={[]}
        language="id"
        onUpdateConstraint={vi.fn()}
      />,
    );

    const caTrack = container.querySelector('[data-nutrient-track="ca"]');
    const pTrack = container.querySelector('[data-nutrient-track="p"]');
    expect(caTrack).toHaveAttribute("data-track-pct", "100");
    expect(caTrack).toHaveAttribute("data-track-tone", "exact");
    expect(pTrack).toHaveAttribute("data-track-pct", "50");
    expect(pTrack).toHaveAttribute("data-track-tone", "over");
  });

  it("Item 4 & Item 5 (App): panel informasi memiliki selectable-panel (sidebar/header tidak) dan subjudul 'Optimalkan nutrisi, tingkatkan produktivitas.' sudah dihapus", () => {
    const { container } = render(<App />);

    // Subjudul sudah dihapus
    expect(
      screen.queryByText(/Optimalkan nutrisi, tingkatkan produktivitas/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Optimize nutrition, boost livestock productivity/i),
    ).not.toBeInTheDocument();

    // Chrome dashboard (aside, header, toolbar section) TIDAK memakai selectable-panel
    const sidebar = container.querySelector("aside");
    const header = container.querySelector("header");
    expect(sidebar?.className).not.toContain("selectable-panel");
    expect(header?.className).not.toContain("selectable-panel");

    // Panel informasi di dalam ruang kerja memakai selectable-panel
    const usedPanel = screen.getByLabelText("Panel Bahan Pakan");
    const allCatalogPanel = screen.getByLabelText("Tabel Semua Bahan Pakan");
    expect(usedPanel.className).toContain("selectable-panel");
    expect(allCatalogPanel.className).toContain("selectable-panel");
  });
});
