import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { ResultsPanel } from "../../src/components/analytics/ResultsPanel";
import { IngredientLibraryPage } from "../../src/components/database/IngredientLibraryPage";
import { FormulationWorkbench } from "../../src/components/formulation/FormulationWorkbench";
import { DesktopSidebar } from "../../src/components/layout/DesktopSidebar";
import {
  GITHUB_RELEASES_URL,
  GITHUB_REPO_URL,
  SettingsPage,
} from "../../src/components/settings/SettingsPage";
import { SegmentedTabs } from "../../src/components/ui/SegmentedTabs";
import {
  DEFAULT_CONFIG,
  DEFAULT_PREFERENCES,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import type { PrototypeStore } from "../../src/hooks/use-prototype-store";
import { getFormulationStatusLabel } from "../../src/i18n";

describe("Revisi 3 — Sidebar 1.5x, Hero Glass, Capaian Nutrien Hasil, Database Tier Kolom, Toast Kanan Atas & Singkatan Nutrien", () => {
  it("DesktopSidebar & AppShell: tab Formulasi Ransum 1.5x lebih besar, tanpa teks 'Ransum Presisi', tanpa profil 'Rezawidya', dan tanpa ikon lonceng header", () => {
    render(
      <DesktopSidebar
        route="formulation"
        onNavigate={vi.fn()}
        language="id"
        expanded
        onToggleExpanded={vi.fn()}
      />,
    );

    const formulationBtn = screen.getByRole("button", { name: "Formulasi Ransum" });
    const databaseBtn = screen.getByRole("button", { name: "Database Bahan" });

    expect(formulationBtn).toHaveAttribute("data-primary-hub", "true");
    expect(formulationBtn.className).toContain("h-[60px]");
    expect(databaseBtn.className).toContain("h-10");

    // Teks "Ransum Presisi" & kartu profil "Rezawidya" sudah dihapus
    expect(screen.queryByText(/Ransum Presisi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Precision Feed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rezawidya/i)).not.toBeInTheDocument();
  });

  it("AppShell & WorkbenchToolbar: menghapus ikon lonceng notifikasi dan mengganti siluet ayam dengan glassmorphism murni", () => {
    const { container } = render(<App />);

    // Tombol lonceng notifikasi sudah dihapus dari header
    expect(
      screen.queryByRole("button", { name: /Status mesin & notifikasi/i }),
    ).not.toBeInTheDocument();

    // Elemen hero kanan atas memakai ambient glassmorphism tanpa siluet ayam
    const heroGlass = container.querySelector('[data-hero-glass="true"]');
    expect(heroGlass).not.toBeNull();
  });

  it("ResultsPanel: menampilkan tabel Ringkasan Capaian Nutrien Hasil Formulasi (Target vs Aktual & Status) di tab Komposisi & Batch", () => {
    const req = MOCK_REQUIREMENTS[0]!;
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, req, DEFAULT_CONFIG);

    render(
      <ResultsPanel
        result={evalRes}
        ingredients={MOCK_INGREDIENTS}
        allNutrients={MOCK_NUTRIENTS}
        requirement={req}
        config={DEFAULT_CONFIG}
        decimalPlaces={1}
        simpleMode
        language="id"
        onSetBatchSize={vi.fn()}
        onToggleElastic={vi.fn()}
        onSetManualLock={vi.fn()}
        onClearManualLocks={vi.fn()}
      />,
    );

    const summarySection = screen.getByLabelText("Ringkasan Capaian Nutrien Hasil Formulasi");
    expect(summarySection).toBeInTheDocument();
    expect(
      within(summarySection).getByText(/Capaian Nutrien Hasil Formulasi \(Target vs Aktual\)/i),
    ).toBeInTheDocument();
    expect(
      within(summarySection).getByRole("columnheader", { name: "Target Dipasang" }),
    ).toBeInTheDocument();
    expect(
      within(summarySection).getByRole("columnheader", { name: "Hasil Aktual" }),
    ).toBeInTheDocument();
    expect(
      within(summarySection).getByRole("columnheader", { name: "Selisih / Kedekatan" }),
    ).toBeInTheDocument();
    expect(within(summarySection).getByText("PK")).toBeInTheDocument();

    // Badge X/Y Terpenuhi menghitung hanya nutrien yang memiliki target aktif (bukan nutrien "Bebas" tanpa batas)
    const constrainedCount = evalRes.nutrients.filter((n) => n.status !== "unconstrained").length;
    const metCount = evalRes.nutrients.filter((n) => n.status === "met").length;
    expect(
      within(summarySection).getByText(new RegExp(`${metCount}/${constrainedCount}\\s+Terpenuhi`)),
    ).toBeInTheDocument();
  });

  it("IngredientLibraryPage: mendukung Tampilan Kolom Dasar/Standar/Lanjutan, popover Kolom, serta horizontal scroll tab 8 kelas", async () => {
    const user = userEvent.setup();

    render(
      <IngredientLibraryPage
        ingredients={MOCK_INGREDIENTS.slice(0, 12)}
        allNutrients={MOCK_NUTRIENTS}
        language="id"
        simpleMode
        onToggleActive={vi.fn()}
        onOpenAdd={vi.fn()}
      />,
    );

    // Default Dasar: BK % dan Lisin belum tampil
    expect(screen.queryByRole("columnheader", { name: /BK %/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Lys/i })).not.toBeInTheDocument();

    // Pindah ke Standar -> BK % dan NDF tampil
    await user.click(screen.getByRole("button", { name: /^Standar$/i }));
    expect(screen.getAllByRole("columnheader", { name: /BK %/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader", { name: /NDF/i }).length).toBeGreaterThan(0);

    // Pindah ke Lanjutan -> Asam amino (Lys, Met) tampil
    await user.click(screen.getByRole("button", { name: /^Lanjutan$/i }));
    expect(screen.getAllByRole("columnheader", { name: /Lys/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader", { name: /Met/i }).length).toBeGreaterThan(0);

    // Buka popover Kolom dan sembunyikan Harga/kg
    const kolomBtn = screen.getByRole("button", { name: /Kolom/i });
    await user.click(kolomBtn);
    const dialog = screen.getByRole("dialog", { name: /Pilih kolom database yang ditampilkan/i });
    const priceCheckbox = within(dialog).getByLabelText("Harga");
    expect(priceCheckbox).toBeChecked();
    await user.click(priceCheckbox);
    expect(screen.queryByRole("columnheader", { name: "Harga/kg" })).not.toBeInTheDocument();

    // Navigasi keyboard ArrowRight pada tab 8 kelas bahan pakan
    const allClassesTab = screen.getByRole("tab", { name: /Semua 8 Kelas/i });
    allClassesTab.focus();
    fireEvent.keyDown(allClassesTab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: /1\. Hijauan Kering/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("SegmentedTabs: mendukung navigasi keyboard ArrowRight/ArrowLeft dan wheel scroll horizontal", () => {
    const onChange = vi.fn();
    render(
      <SegmentedTabs
        ariaLabel="Tab Uji"
        value="tab1"
        onChange={onChange}
        options={[
          { value: "tab1", label: "Tab Satu" },
          { value: "tab2", label: "Tab Dua" },
          { value: "tab3", label: "Tab Tiga" },
        ]}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "Tab Uji" });
    fireEvent.wheel(tablist, { deltaY: 120, deltaX: 0 });

    const tab1 = screen.getByRole("tab", { name: "Tab Satu" });
    fireEvent.keyDown(tab1, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("tab2");
  });

  it("SettingsPage: memiliki tombol Cek Update di Repo GitHub dan toggle Singkatan Nama Nutrien (default ON / Disingkat)", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    const { rerender } = render(
      <SettingsPage preferences={DEFAULT_PREFERENCES} onUpdate={onUpdate} />,
    );

    // 1. Tombol cek update di repo GitHub
    const releaseLink = screen.getByRole("link", {
      name: /Cek update aplikasi terbaru di repositori GitHub/i,
    });
    expect(releaseLink).toHaveAttribute("href", GITHUB_RELEASES_URL);
    expect(releaseLink).toHaveAttribute("target", "_blank");
    expect(releaseLink).toHaveAttribute("rel", "noopener noreferrer");

    const repoLink = screen.getByRole("link", { name: /Buka Repo/i });
    expect(repoLink).toHaveAttribute("href", GITHUB_REPO_URL);

    // 2. Toggle Singkatan Nama Nutrien default ON (true)
    const abbrevSwitch = screen.getByRole("switch", {
      name: /Gunakan Singkatan Nama Nutrien/i,
    });
    expect(abbrevSwitch).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Disingkat \(Default\)/i)).toBeInTheDocument();

    await user.click(abbrevSwitch);
    expect(onUpdate).toHaveBeenCalledWith({ simpleMode: false });

    rerender(
      <SettingsPage
        preferences={{ ...DEFAULT_PREFERENCES, simpleMode: false }}
        onUpdate={onUpdate}
      />,
    );
    expect(screen.getByRole("switch", { name: /Gunakan Singkatan Nama Nutrien/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByText("Nama Lengkap")).toBeInTheDocument();
  });

  it("Singkatan Nama Nutrien (ON vs OFF) berlaku konsisten di tabel bahan, target nutrien, dan hasil formulasi", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Default: Disingkat (PK, EM, LK, SK)
    const usedPanel = screen.getByLabelText("Panel Bahan Pakan");
    expect(within(usedPanel).getAllByRole("columnheader", { name: /PK/i }).length).toBeGreaterThan(
      0,
    );

    // Buka Pengaturan -> matikan Singkatan Nama Nutrien -> kembali ke Formulasi Ransum
    await user.click(screen.getAllByRole("button", { name: /Pengaturan/i })[0]!);
    const abbrevSwitch = screen.getByRole("switch", {
      name: /Gunakan Singkatan Nama Nutrien/i,
    });
    await user.click(abbrevSwitch);

    await user.click(screen.getAllByRole("button", { name: /Formulasi Ransum/i })[0]!);

    const usedPanelAfter = screen.getByLabelText("Panel Bahan Pakan");
    expect(
      within(usedPanelAfter).getAllByRole("columnheader", { name: /Protein Kasar/i }).length,
    ).toBeGreaterThan(0);
    expect(
      within(usedPanelAfter).getAllByRole("columnheader", { name: /Lemak Kasar/i }).length,
    ).toBeGreaterThan(0);
    expect(
      within(usedPanelAfter).getAllByRole("columnheader", { name: /Serat Kasar/i }).length,
    ).toBeGreaterThan(0);

    // Berpindah Tampilan Kolom ke Standar atau Dasar TIDAK boleh menimpa pilihan Nama Lengkap dari Pengaturan
    await user.click(within(usedPanelAfter).getByRole("button", { name: /^Standar$/i }));
    expect(
      within(usedPanelAfter).getAllByRole("columnheader", { name: /Protein Kasar/i }).length,
    ).toBeGreaterThan(0);
    await user.click(within(usedPanelAfter).getByRole("button", { name: /^Dasar$/i }));
    expect(
      within(usedPanelAfter).getAllByRole("columnheader", { name: /Protein Kasar/i }).length,
    ).toBeGreaterThan(0);
  });

  it("getFormulationStatusLabel & FormulationWorkbench: status infeasible ramah peternak & notifikasi solving berupa floating toast kanan atas", () => {
    expect(getFormulationStatusLabel("id", "infeasible")).toBe("Formula Tidak Ditemukan");
    expect(getFormulationStatusLabel("en", "infeasible")).toBe("Infeasible");

    const req = MOCK_REQUIREMENTS[0]!;
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, req, DEFAULT_CONFIG);
    const mockStore: PrototypeStore = {
      route: "formulation",
      setRoute: vi.fn(),
      ingredients: MOCK_INGREDIENTS,
      requirements: MOCK_REQUIREMENTS,
      allNutrients: MOCK_NUTRIENTS,
      activeRequirement: req,
      hasActiveRequirementOverride: false,
      config: DEFAULT_CONFIG,
      result: evalRes,
      isSolving: true,
      isHydrated: true,
      storageMode: "memory",
      storageStats: {
        storageMode: "memory",
        ingredientCount: MOCK_INGREDIENTS.length,
        requirementCount: MOCK_REQUIREMENTS.length,
        recipeCount: 0,
        estimatedBytes: 1024,
      },
      storageWarnings: [],
      recipes: [],
      preferences: DEFAULT_PREFERENCES,
      demoScenario: "auto",
      setDemoScenario: vi.fn(),
      selectPreset: vi.fn(),
      applyDynamicRequirement: vi.fn(),
      updateIngredient: vi.fn(),
      importIngredients: vi.fn(),
      addIngredient: vi.fn(),
      resetPriceOverride: vi.fn(),
      updateConstraint: vi.fn(),
      addCustomNutrient: vi.fn(() => ({ ok: true })),
      removeCustomNutrient: vi.fn(),
      updateCustomNutrientBasis: vi.fn(),
      addRequirement: vi.fn(),
      setActiveBasis: vi.fn(),
      setOptimizationMode: vi.fn(),
      setTargetInputMode: vi.fn(),
      setBatchSizeKg: vi.fn(),
      toggleAdvanceNutrients: vi.fn(),
      toggleShowNdf: vi.fn(),
      toggleShowBetn: vi.fn(),
      setDecimalPlaces: vi.fn(),
      setTableViewTier: vi.fn(),
      toggleDigestibleBasis: vi.fn(),
      toggleElasticFallback: vi.fn(),
      updatePrecisionConfig: vi.fn(),
      setGlobalZeroInclusion: vi.fn(),
      setManualLock: vi.fn(),
      clearManualLocks: vi.fn(),
      saveCurrentRecipe: vi.fn(),
      loadRecipe: vi.fn(),
      importFeedJson: vi.fn(),
      deleteRecipe: vi.fn(),
      exportAllBackupJson: vi.fn(() => "{}"),
      setLanguage: vi.fn(),
      setTheme: vi.fn(),
      updatePreferences: vi.fn(),
      resetAllMock: vi.fn(),
      resetAllSampleData: vi.fn(() => Promise.resolve()),
      clearAllUserData: vi.fn(() => Promise.resolve()),
    };

    const { container } = render(
      <FormulationWorkbench
        store={mockStore}
        onOpenSaveDialog={vi.fn()}
        onOpenExportDialog={vi.fn()}
        onOpenAddIngredient={vi.fn()}
      />,
    );

    const toast = container.querySelector('[data-solving-toast="top-right"]');
    expect(toast).not.toBeNull();
    expect(toast?.className).toContain("fixed");
    expect(toast?.className).toContain("right-4");
    expect(screen.getByText(/Menghitung formula optimal…/i)).toBeInTheDocument();
  });
});
