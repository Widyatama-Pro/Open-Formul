import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IngredientLibraryPage } from "../../src/components/database/IngredientLibraryPage";
import { IngredientDesktopTable } from "../../src/components/formulation/IngredientDesktopTable";
import { ExportDialog } from "../../src/components/recipes/ExportDialog";
import { SavedRecipesPage } from "../../src/components/recipes/SavedRecipesPage";
import { SettingsPage } from "../../src/components/settings/SettingsPage";
import {
  DEFAULT_CONFIG,
  DEFAULT_PREFERENCES,
  MOCK_INGREDIENTS,
  MOCK_REQUIREMENTS,
  MOCK_SAVED_RECIPES,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import type { FormulationResult } from "../../src/types";
import * as downloadUtils from "../../src/utils/download";

function makeOptimalResult(): FormulationResult {
  const base = evaluateMockFormulation(MOCK_INGREDIENTS, MOCK_REQUIREMENTS[0]!, DEFAULT_CONFIG);
  return {
    ...base,
    status: "optimal",
    costPerKg: 6450,
    batchTotalCost: 645000,
    batchSizeKg: 100,
    composition: [
      {
        ingredientId: "corn-ground",
        fraction: 0.58,
        asFedFraction: 0.58,
        weightKg: 58,
        costContribution: 319000,
      },
      {
        ingredientId: "sbm-44",
        fraction: 0.32,
        asFedFraction: 0.32,
        weightKg: 32,
        costContribution: 262400,
      },
      {
        ingredientId: "rice-bran",
        fraction: 0.1,
        asFedFraction: 0.1,
        weightKg: 10,
        costContribution: 30000,
      },
    ],
  };
}

describe("Task 5 — Fase 3 UI Wiring: Export Gates, CSV/Feed Import, TSV Paste & IndexedDB Settings", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ExportDialog: mengekspor .feed.json, CSV, .xlsx, PDF lengkap & PDF batch_only saat Optimal, dan menegakkan gerbang keamanan Near-Feasible / Infeasible", async () => {
    const textSpy = vi.spyOn(downloadUtils, "downloadTextFile").mockImplementation(() => {});
    const binSpy = vi.spyOn(downloadUtils, "downloadBinaryFile").mockImplementation(() => {});
    const user = userEvent.setup();

    const optimalResult = makeOptimalResult();
    const { rerender } = render(
      <ExportDialog
        open
        onClose={vi.fn()}
        ingredients={MOCK_INGREDIENTS}
        requirement={MOCK_REQUIREMENTS[0]!}
        config={DEFAULT_CONFIG}
        result={optimalResult}
      />,
    );

    const feedBtn = screen.getByRole("button", { name: /Resep Portabel.*\.feed\.json/i });
    const csvBtn = screen.getByRole("button", { name: /Unduh CSV/i });
    const xlsxBtn = screen.getByRole("button", { name: /Unduh Excel/i });
    const pdfFullBtn = screen.getByRole("button", { name: /PDF Lembar Formula Lengkap/i });
    const pdfBatchBtn = screen.getByRole("button", { name: /PDF Print Batch Only/i });

    expect(feedBtn).toBeEnabled();
    expect(csvBtn).toBeEnabled();
    expect(xlsxBtn).toBeEnabled();
    expect(pdfFullBtn).toBeEnabled();
    expect(pdfBatchBtn).toBeEnabled();

    await user.click(feedBtn);
    await user.click(csvBtn);
    await user.click(xlsxBtn);
    await user.click(pdfFullBtn);
    await user.click(pdfBatchBtn);

    expect(textSpy).toHaveBeenCalledTimes(2);
    expect(textSpy.mock.calls[0]![1]).toMatch(/\.feed\.json$/);
    expect(textSpy.mock.calls[1]![1]).toMatch(/\.csv$/);

    expect(binSpy).toHaveBeenCalledTimes(3);
    expect(binSpy.mock.calls[0]![1]).toMatch(/\.xlsx$/);
    expect(binSpy.mock.calls[1]![1]).toMatch(/-lengkap\.pdf$/);
    expect(binSpy.mock.calls[2]![1]).toMatch(/-batch\.pdf$/);

    // Rerender dengan Near-Feasible -> Batch Only WAJIB terkunci, PDF Lengkap/CSV/XLSX tampilkan peringatan
    rerender(
      <ExportDialog
        open
        onClose={vi.fn()}
        ingredients={MOCK_INGREDIENTS}
        requirement={MOCK_REQUIREMENTS[0]!}
        config={DEFAULT_CONFIG}
        result={{ ...optimalResult, status: "near_feasible" }}
      />,
    );
    expect(
      screen.getByText(/Mode Relaksasi Elastik — dokumen bertanda kompromi nutrisi/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /PDF Print Batch Only/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /PDF Lembar Formula Lengkap/i })).toBeEnabled();

    // Rerender dengan Infeasible -> CSV/XLSX/PDF nonaktif, .feed.json tetap aktif untuk troubleshooting
    rerender(
      <ExportDialog
        open
        onClose={vi.fn()}
        ingredients={MOCK_INGREDIENTS}
        requirement={MOCK_REQUIREMENTS[0]!}
        config={DEFAULT_CONFIG}
        result={{
          ...optimalResult,
          status: "infeasible",
          costPerKg: null,
          batchTotalCost: null,
          composition: [],
        }}
      />,
    );
    expect(screen.getByRole("button", { name: /Resep Portabel.*\.feed\.json/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Unduh CSV/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /PDF Lembar Formula Lengkap/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /PDF Print Batch Only/i })).toBeDisabled();
  });

  it("SavedRecipesPage: mendukung unduh .feed.json per kartu, impor .feed.json valid & tolak file rusak, serta hapus resep", async () => {
    const textSpy = vi.spyOn(downloadUtils, "downloadTextFile").mockImplementation(() => {});
    const onImportFeedJson = vi.fn().mockReturnValue({
      ok: false,
      errors: ["Versi skema .feed.json tidak didukung (99)."],
    });
    const onDeleteRecipe = vi.fn();
    const user = userEvent.setup();

    render(
      <SavedRecipesPage
        recipes={MOCK_SAVED_RECIPES}
        language="id"
        onLoadRecipe={vi.fn()}
        onOpenSaveCurrent={vi.fn()}
        onOpenExport={vi.fn()}
        onImportFeedJson={onImportFeedJson}
        onDeleteRecipe={onDeleteRecipe}
      />,
    );

    const downloadButtons = screen.getAllByRole("button", { name: /Unduh \.feed\.json/i });
    expect(downloadButtons.length).toBe(MOCK_SAVED_RECIPES.length);
    await user.click(downloadButtons[0]!);
    expect(textSpy).toHaveBeenCalledTimes(1);
    expect(textSpy.mock.calls[0]![1]).toMatch(/\.feed\.json$/);

    const fileInput = screen.getByLabelText(/Unggah berkas \.feed\.json/i);
    const badFile = new File(['{"schemaVersion":99}'], "rusak.feed.json", {
      type: "application/json",
    });
    await user.upload(fileInput, badFile);
    expect(onImportFeedJson).toHaveBeenCalledWith('{"schemaVersion":99}');
    expect(await screen.findByText(/Versi skema \.feed\.json tidak didukung/i)).toBeInTheDocument();

    const firstDeleteBtn = screen.getByRole("button", {
      name: `Hapus resep ${MOCK_SAVED_RECIPES[0]!.name}`,
    });
    await user.click(firstDeleteBtn);
    expect(onDeleteRecipe).toHaveBeenCalledWith(MOCK_SAVED_RECIPES[0]!.id);
  });

  it("IngredientLibraryPage: mengaktifkan Impor CSV/JSON dengan Sumber Default opsional & melakukan partial merge", async () => {
    const onImportIngredients = vi.fn();
    const user = userEvent.setup();

    render(
      <IngredientLibraryPage
        ingredients={MOCK_INGREDIENTS}
        language="id"
        onToggleActive={vi.fn()}
        onOpenAdd={vi.fn()}
        onImportIngredients={onImportIngredients}
      />,
    );

    const importBtn = screen.getByRole("button", { name: /Impor CSV \/ JSON/i });
    expect(importBtn).toBeEnabled();
    await user.click(importBtn);

    const csvFile = new File(
      ["Nama Bahan;Harga/kg;BK %;PK (%)\nJagung Giling Kuning;5.950;88,5;9,1"],
      "harga-update.csv",
      { type: "text/csv" },
    );
    const fileInput = screen.getByLabelText(/Pilih file CSV atau JSON bahan pakan/i);
    await user.upload(fileInput, csvFile);

    expect(onImportIngredients).toHaveBeenCalledTimes(1);
    const mergedArg = onImportIngredients.mock.calls[0]![0] as typeof MOCK_INGREDIENTS;
    const updatedCorn = mergedArg.find((i) => i.id === "corn-ground")!;
    expect(updatedCorn.pricePerKg).toBe(5950);
    expect(updatedCorn.nutrients.lys).toBe(0.26); // asam amino lama tidak terhapus!
    expect(await screen.findByText(/1 bahan diperbarui/i)).toBeInTheDocument();
  });

  it("IngredientDesktopTable: mendukung Paste TSV blok dari Excel/Sheets & abaikan tempelan skalar 1 sel", () => {
    const onBatchUpdate = vi.fn();
    const starterSubset = MOCK_INGREDIENTS.slice(0, 4);

    render(
      <IngredientDesktopTable
        ingredients={starterSubset}
        allIngredients={MOCK_INGREDIENTS}
        showAdvanceColumns={false}
        globalAntiNol={false}
        language="id"
        onUpdateIngredient={vi.fn()}
        onResetPriceOverride={vi.fn()}
        onOpenDetail={vi.fn()}
        onBatchIngredientsUpdate={onBatchUpdate}
      />,
    );

    const priceCornInput = screen.getByLabelText("Harga/kg Jagung Giling Kuning");

    // 1. Tempelan skalar tunggal -> tidak memanggil batch update
    fireEvent.paste(priceCornInput, {
      clipboardData: { getData: () => "6200" },
    });
    expect(onBatchUpdate).not.toHaveBeenCalled();

    // 2. Tempelan 2x2 TSV (Harga/kg + BK %) -> memperbarui 2 baris sekaligus
    fireEvent.paste(priceCornInput, {
      clipboardData: { getData: () => "6.100\t88,5\n9.300\t90" },
    });
    expect(onBatchUpdate).toHaveBeenCalledTimes(1);
    const updatedAll = onBatchUpdate.mock.calls[0]![0] as typeof MOCK_INGREDIENTS;
    expect(updatedAll.find((i) => i.id === "corn-ground")?.priceOverride).toBe(6100);
    expect(updatedAll.find((i) => i.id === "corn-ground")?.dryMatter).toBe(88.5);
    expect(updatedAll.find((i) => i.id === "sbm-44")?.priceOverride).toBe(9300);
    expect(screen.getByText(/4 sel ditempel dari spreadsheet/i)).toBeInTheDocument();
  });

  it("SettingsPage (2A/3A): menampilkan statistik IndexedDB + PWA serta 2 aksi pemulihan aman", async () => {
    const onResetSampleData = vi.fn().mockResolvedValue(undefined);
    const onClearAllUserData = vi.fn().mockResolvedValue(undefined);
    const onExportAllBackup = vi.fn();
    const user = userEvent.setup();

    render(
      <SettingsPage
        preferences={DEFAULT_PREFERENCES}
        onUpdate={vi.fn()}
        storageStats={{
          storageMode: "indexeddb",
          ingredientCount: 23,
          requirementCount: 9,
          recipeCount: 3,
          estimatedBytes: 42500,
        }}
        pwaStatus={{
          isOnline: true,
          offlineReady: true,
          needRefresh: false,
          swSupported: true,
          applyUpdate: vi.fn(),
        }}
        onExportAllBackup={onExportAllBackup}
        onResetSampleData={onResetSampleData}
        onClearAllUserData={onClearAllUserData}
      />,
    );

    expect(screen.getByText(/IndexedDB Aktif/i)).toBeInTheDocument();
    expect(screen.getByText(/23 bahan/i)).toBeInTheDocument();
    expect(screen.getByText(/Siap Offline/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Unduh Backup Semua/i }));
    expect(onExportAllBackup).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Reset Data Bawaan/i }));
    expect(onResetSampleData).toHaveBeenCalledTimes(1);

    // Hapus permanen butuh konfirmasi 2 tahap
    await user.click(screen.getByRole("button", { name: /Hapus Semua Data Lokal/i }));
    expect(onClearAllUserData).not.toHaveBeenCalled();

    const confirmBtn = within(screen.getByRole("alert")).getByRole("button", {
      name: /Konfirmasi Hapus Permanen/i,
    });
    await user.click(confirmBtn);
    expect(onClearAllUserData).toHaveBeenCalledTimes(1);
  });
});
