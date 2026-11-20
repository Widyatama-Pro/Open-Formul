import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { SettingsPage } from "../../src/components/settings/SettingsPage";
import { TRAKTEER_SUPPORT_URL } from "../../src/components/ui/TrakteerSupportButton";
import { DEFAULT_PREFERENCES } from "../../src/data/mock-state";
import { OPENFORMUL_PALETTE_CATALOG, THEME_STORAGE_KEYS, ThemeProvider } from "../../src/theme";
import { validateUserPreferences } from "../../src/utils/validators";

describe("UI Enhancer (7 Palettes), 120 FPS Rendering/Motion Engine & Trakteer Integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
    document.documentElement.removeAttribute("data-ui-enhancer");
    document.documentElement.removeAttribute("data-engine-mode");
    document.documentElement.removeAttribute("data-motion-engine");
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("mengaktifkan UI Enhancer secara default pada seluruh 7 palet warna dan dapat dialihkan ke mode Standard", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <ThemeProvider>
        <SettingsPage preferences={DEFAULT_PREFERENCES} onUpdate={onUpdate} />
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("true");
    expect(document.documentElement.getAttribute("data-engine-mode")).toBe("ultra");
    expect(document.documentElement.getAttribute("data-motion-engine")).toBe("gpu_flip");

    // Uji semua 7 palet tetap menerapkan UI Enhancer aktif dan memperbarui label profil glow-nya
    for (const palette of OPENFORMUL_PALETTE_CATALOG) {
      const btn = document.querySelector<HTMLButtonElement>(
        `[data-theme-control="palette"][data-palette-id="${palette.id}"]`,
      );
      expect(btn).not.toBeNull();
      await user.click(btn!);
      expect(document.documentElement.getAttribute("data-theme")).toBe(palette.id);
      expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("true");
      expect(screen.getByText(new RegExp(palette.enhancerGlowLabelId, "i"))).toBeInTheDocument();
    }

    // Matikan sakelar UI Enhancer -> attribute DOM & localStorage berubah ke false
    const enhancerSwitch = screen.getByRole("switch", {
      name: /Aktifkan Mode UI Enhancer Glassmorphism/i,
    });
    await user.click(enhancerSwitch);
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("false");
    expect(window.localStorage.getItem(THEME_STORAGE_KEYS.uiEnhancer)).toBe("false");
  });

  it("mendukung 3 profil Rendering Engine, Animation Engine, dan slider Blur/Glow di Pengaturan", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <ThemeProvider>
        <SettingsPage preferences={DEFAULT_PREFERENCES} onUpdate={onUpdate} />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("radio", { name: /Mode 2 · Balanced Acrylic/i }));
    expect(document.documentElement.getAttribute("data-engine-mode")).toBe("balanced");
    expect(document.documentElement.style.getPropertyValue("--ui-blur-px")).toBe("12px");

    await user.click(screen.getByRole("radio", { name: /Mode 3 · Crisp Native/i }));
    expect(document.documentElement.getAttribute("data-engine-mode")).toBe("crisp");
    expect(document.documentElement.style.getPropertyValue("--ui-blur-px")).toBe("0px");

    await user.click(screen.getByRole("radio", { name: /Mode 1 · Ultra Glass/i }));
    expect(document.documentElement.getAttribute("data-engine-mode")).toBe("ultra");

    const blurSlider = screen.getByLabelText("Intensitas Blur Kaca");
    fireEvent.change(blurSlider, { target: { value: "24" } });
    expect(document.documentElement.style.getPropertyValue("--ui-blur-px")).toBe("24px");

    const glowSlider = screen.getByLabelText("Intensitas Glow");
    fireEvent.change(glowSlider, { target: { value: "125" } });
    expect(document.documentElement.style.getPropertyValue("--ui-glow-scale")).toBe("1.25");

    await user.click(screen.getByRole("radio", { name: /CSS Native \/ Reduced/i }));
    expect(document.documentElement.getAttribute("data-motion-engine")).toBe("css_native");
  });

  it("menampilkan tombol dukungan Trakteer dengan tautan aman di Sidebar maupun SettingsPage", async () => {
    const user = userEvent.setup();
    render(<App />);

    const sidebarTrakteer = screen.getByRole("link", { name: /Dukung via Trakteer/i });
    expect(sidebarTrakteer).toHaveAttribute("href", TRAKTEER_SUPPORT_URL);
    expect(sidebarTrakteer).toHaveAttribute("target", "_blank");
    expect(sidebarTrakteer).toHaveAttribute("rel", "noopener noreferrer");

    // Buka halaman Pengaturan dan pastikan kartu Trakteer juga tersedia di sana
    await user.click(screen.getAllByRole("button", { name: /Pengaturan/i })[0]!);
    const trakteerLinks = screen.getAllByRole("link", { name: /Dukung via Trakteer/i });
    expect(trakteerLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of trakteerLinks) {
      expect(link).toHaveAttribute("href", TRAKTEER_SUPPORT_URL);
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("memvalidasi opsi uiEnhancer, renderingEngine, motionEngine, glassBlurPx & glowIntensityPct di validateUserPreferences", () => {
    const valid = validateUserPreferences({
      language: "id",
      theme: "light",
      uiEnhancer: true,
      renderingEngine: "balanced",
      motionEngine: "gpu_flip",
      glassBlurPx: 16,
      glowIntensityPct: 110,
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.uiEnhancer).toBe(true);
      expect(valid.data.renderingEngine).toBe("balanced");
      expect(valid.data.motionEngine).toBe("gpu_flip");
      expect(valid.data.glassBlurPx).toBe(16);
      expect(valid.data.glowIntensityPct).toBe(110);
    }

    const clamped = validateUserPreferences({
      language: "en",
      theme: "dark",
      renderingEngine: "invalid",
      motionEngine: "invalid",
      glassBlurPx: 999,
      glowIntensityPct: -20,
    });
    expect(clamped.ok).toBe(true);
    if (clamped.ok) {
      expect(clamped.data.renderingEngine).toBeUndefined();
      expect(clamped.data.motionEngine).toBeUndefined();
      expect(clamped.data.glassBlurPx).toBeUndefined();
      expect(clamped.data.glowIntensityPct).toBeUndefined();
    }
  });
});
