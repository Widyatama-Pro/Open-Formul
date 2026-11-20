import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { ResultsPanel } from "../../src/components/analytics/ResultsPanel";
import { ShadowPriceTab } from "../../src/components/analytics/ShadowPriceTab";
import { IngredientLibraryPage } from "../../src/components/database/IngredientLibraryPage";
import { AllIngredientsCatalogTable } from "../../src/components/formulation/AllIngredientsCatalogTable";
import { IngredientDesktopTable } from "../../src/components/formulation/IngredientDesktopTable";
import { IngredientMobileCards } from "../../src/components/formulation/IngredientMobileCards";
import { AppShell } from "../../src/components/layout/AppShell";
import { SheetDialog } from "../../src/components/ui/SheetDialog";
import { TrakteerSupportButton } from "../../src/components/ui/TrakteerSupportButton";
import { HARTADI_FEEDS } from "../../src/data/hartadi-feeds";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import { applyAndroidSystemInsets, syncAndroidSystemBars } from "../../src/theme";

interface MockBridgeWindow extends Window {
  OpenFormulSystemBars?: {
    setSystemBars?: (statusHex: string, navHex: string, isDarkBackground: boolean) => void;
    getSystemInsetsCss?: () => string;
  };
}

describe("Revisi 5 — Android Mobile/Landscape UX, Table Scroll, Mobile Nutrients & Cattle LK/SK", () => {
  afterEach(() => {
    delete (window as MockBridgeWindow).OpenFormulSystemBars;
    document.documentElement.style.removeProperty("--android-inset-top");
    document.documentElement.style.removeProperty("--android-inset-right");
    document.documentElement.style.removeProperty("--android-inset-bottom");
    document.documentElement.style.removeProperty("--android-inset-left");
    vi.restoreAllMocks();
  });

  it("R5-01: TrakteerSupportButton (variant='settings') menyusun teks & CTA secara vertikal di mobile tanpa menjepit teks", () => {
    const { container } = render(<TrakteerSupportButton variant="settings" language="id" />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("p-3.5");
    expect(card.className).toContain("sm:p-5");

    const layoutRow = card.firstElementChild as HTMLElement;
    expect(layoutRow.className).toContain("flex-col");
    expect(layoutRow.className).toContain("sm:flex-row");

    const cta = screen.getByRole("link", { name: /Dukung via Trakteer/i });
    expect(cta.className).toContain("w-full");
    expect(cta.className).toContain("sm:w-auto");
  });

  it("R5-02: memperbaiki nama Pepaya Hartadi 0089/0091 & membatasi sticky kolom kiri ke md:sticky agar bisa digeser di Android", () => {
    const p89 = HARTADI_FEEDS.find((f) => f.id === "hartadi-t12-0089");
    const p91 = HARTADI_FEEDS.find((f) => f.id === "hartadi-t12-0091");
    expect(p89?.name).toBe("Pepaya, buah, matang, masak, segar (0089)");
    expect(p89?.nameEn).toBe("Papaya, fruit, fresh (0089)");
    expect(p91?.name).toBe("Pepaya, buah, muda, hijau, segar (0091)");
    expect(p91?.nameEn).toBe("Papaya, fruit, fresh, immature (0091)");

    const sample = MOCK_INGREDIENTS.slice(0, 3);
    const { container: libContainer } = render(
      <IngredientLibraryPage
        ingredients={sample}
        allNutrients={MOCK_NUTRIENTS}
        language="id"
        onToggleActive={vi.fn()}
        onOpenAdd={vi.fn()}
      />,
    );
    const libNameHeader = within(libContainer).getAllByRole("columnheader", {
      name: /Nama Bahan/i,
    })[0]!;
    expect(libNameHeader.className).toContain("md:sticky");
    expect(libNameHeader.className).not.toMatch(/(^|\s)sticky(\s|$)/);

    const { container: allCatContainer } = render(
      <AllIngredientsCatalogTable
        items={sample}
        allNutrients={MOCK_NUTRIENTS}
        language="id"
        searchQuery=""
        onToggleActive={vi.fn()}
        onOpenDetail={vi.fn()}
        onResetFilter={vi.fn()}
      />,
    );
    const allCatScroll = allCatContainer.firstElementChild as HTMLElement;
    expect(allCatScroll.style.touchAction).toBe("pan-x pan-y");
    const allCatHeader = within(allCatContainer).getByRole("columnheader", {
      name: /Nama Bahan/i,
    });
    expect(allCatHeader.className).toContain("md:sticky");
    expect(allCatHeader.className).not.toMatch(/(^|\s)sticky(\s|$)/);

    const { container: deskContainer } = render(
      <IngredientDesktopTable
        ingredients={sample}
        allNutrients={MOCK_NUTRIENTS}
        showAdvanceColumns={false}
        language="id"
        onUpdateIngredient={vi.fn()}
        onResetPriceOverride={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );
    const deskHeader = within(deskContainer).getByRole("columnheader", { name: /Nama Bahan/i });
    expect(deskHeader.className).toContain("md:sticky");
    expect(deskHeader.className).not.toMatch(/(^|\s)sticky(\s|$)/);
  });

  it("R5-03: syncAndroidSystemBars memanggil bridge native OpenFormulSystemBars & mengisi --android-inset-*", async () => {
    const setSystemBars = vi.fn();
    (window as MockBridgeWindow).OpenFormulSystemBars = {
      setSystemBars,
      getSystemInsetsCss: () => JSON.stringify({ top: 32, right: 0, bottom: 20, left: 0 }),
    };

    const res = await syncAndroidSystemBars({
      paletteId: "original-default",
      mode: "dark",
      uiEnhancer: true,
    });

    expect(res.appliedToCapacitor).toBe(true);
    expect(res.isDarkBackground).toBe(true);
    expect(setSystemBars).toHaveBeenCalledWith(res.backgroundColor, res.backgroundColor, true);
    expect(document.documentElement.style.getPropertyValue("--android-inset-top")).toBe("32px");
    expect(document.documentElement.style.getPropertyValue("--android-inset-bottom")).toBe("20px");

    // Standard mode (uiEnhancer: false) in light mode has dark header (#142B27) -> light icons (isDarkBackground=true)
    const stdLight = await syncAndroidSystemBars({
      paletteId: "original-default",
      mode: "light",
      uiEnhancer: false,
    });
    expect(stdLight.backgroundColor).toBe("#142B27");
    expect(stdLight.isDarkBackground).toBe(true);

    expect(applyAndroidSystemInsets({ top: 24, right: 44, bottom: 16, left: 44 })).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--android-inset-left")).toBe("44px");
    expect(document.documentElement.style.getPropertyValue("--android-inset-right")).toBe("44px");
  });

  it("R5-04: IngredientMobileCards menampilkan seluruh nutrien dasar adaptif spesies & menyediakan toggle Min/Max", async () => {
    const user = userEvent.setup();
    const corn = MOCK_INGREDIENTS.find((i) => i.id === "corn-ground")!;
    const invalidFeed = {
      ...MOCK_INGREDIENTS.find((i) => i.id === "sbm-44")!,
      inclusion: { min: 50, max: 20 },
    };

    const { rerender } = render(
      <IngredientMobileCards
        ingredients={[corn]}
        activeSpecies="cattle_beef"
        language="id"
        onUpdateIngredient={vi.fn()}
        onResetPriceOverride={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    // Semua nutrien dasar tampil (PK, TDN untuk sapi, LK, SK, Ca, P, BK, Pasar)
    const nutrientGrid = screen.getByLabelText(/Nutrien dasar Jagung Giling Kuning/i);
    expect(within(nutrientGrid).getByText("PK")).toBeInTheDocument();
    expect(within(nutrientGrid).getByText("TDN")).toBeInTheDocument();
    expect(within(nutrientGrid).queryByText("EM")).not.toBeInTheDocument();
    expect(within(nutrientGrid).getByText("LK")).toBeInTheDocument();
    expect(within(nutrientGrid).getByText("SK")).toBeInTheDocument();
    expect(within(nutrientGrid).getByText("Ca")).toBeInTheDocument();
    expect(within(nutrientGrid).getByText("P")).toBeInTheDocument();
    expect(within(nutrientGrid).getByText("BK")).toBeInTheDocument();
    expect(within(nutrientGrid).getByText("Pasar")).toBeInTheDocument();

    // Default: input Min % & Max % tersembunyi, ringkasan batas 0-70% tampil sebagai tombol toggle
    expect(screen.queryByLabelText("Min % Jagung Giling Kuning")).not.toBeInTheDocument();
    const boundsToggle = screen.getByRole("button", {
      name: /Atur Min\/Max Jagung Giling Kuning/i,
    });
    expect(boundsToggle).toHaveTextContent("0–70%");

    // Klik toggle membuka input Min % & Max %
    await user.click(boundsToggle);
    expect(screen.getByLabelText("Min % Jagung Giling Kuning")).toBeInTheDocument();
    expect(screen.getByLabelText("Max % Jagung Giling Kuning")).toBeInTheDocument();

    // Spesies unggas (broiler) menampilkan EM alih-alih TDN; bahan invalidBounds (min > max) otomatis terbuka
    rerender(
      <IngredientMobileCards
        ingredients={[corn, invalidFeed]}
        activeSpecies="broiler"
        showBounds={false}
        language="id"
        onUpdateIngredient={vi.fn()}
        onResetPriceOverride={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );
    const poultryGrid = screen.getByLabelText(/Nutrien dasar Jagung Giling Kuning/i);
    expect(within(poultryGrid).getByText("EM")).toBeInTheDocument();
    expect(within(poultryGrid).queryByText("TDN")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Min % Bungkil Kedelai (SBM 44%)")).toBeInTheDocument();
  });

  it("R5-05 & R5-06: ResultsPanel menyediakan mobileLabel ringkas tanpa merusak aksesibilitas & ShadowPriceTab punya layout kartu mobile", async () => {
    const user = userEvent.setup();
    const req = MOCK_REQUIREMENTS[0]!;
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, req, DEFAULT_CONFIG);

    render(
      <ResultsPanel
        result={evalRes}
        ingredients={MOCK_INGREDIENTS}
        allNutrients={MOCK_NUTRIENTS}
        requirement={req}
        config={DEFAULT_CONFIG}
        language="id"
        onSetBatchSize={vi.fn()}
        onToggleElastic={vi.fn()}
        onSetManualLock={vi.fn()}
        onClearManualLocks={vi.fn()}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: /Sub-tampilan hasil formulasi/i });
    expect(tablist.className).toContain("flex");
    expect(tablist.className).not.toContain("auto-cols-fr");

    const shadowTab = screen.getByRole("tab", { name: "Harga Bayangan" });
    expect(within(shadowTab).getByText("Bayangan")).toBeInTheDocument();

    await user.click(shadowTab);
    expect(screen.getByText(/Harga Bayangan Kendala Nutrisi/i)).toBeInTheDocument();

    // ShadowPriceTab memiliki tabel desktop ber-padding (px-2.5) dan kartu mobile (md:hidden)
    render(
      <ShadowPriceTab
        nutrients={evalRes.nutrients}
        allNutrients={MOCK_NUTRIENTS}
        composition={evalRes.composition}
        opportunityCosts={evalRes.opportunityCosts ?? []}
        boundDuals={evalRes.boundDuals ?? []}
        ingredients={MOCK_INGREDIENTS}
        requirement={req}
        config={DEFAULT_CONFIG}
        language="id"
      />,
    );
    expect(screen.getAllByText(/PK \(%\)/i).length).toBeGreaterThanOrEqual(2);
  });

  it("R5-07: AppShell & SheetDialog memasang class safe-area dan landscape-compact untuk layar pendek Android", () => {
    const { container } = render(
      <AppShell
        route="formulation"
        onNavigate={vi.fn()}
        language="id"
        theme="light"
        onToggleTheme={vi.fn()}
        onToggleLanguage={vi.fn()}
      >
        <div>Konten Uji</div>
      </AppShell>,
    );

    const header = container.querySelector("header");
    expect(header?.className).toContain("safe-area-header");
    expect(header?.className).toContain("landscape-compact-header");

    const nav = screen.getByRole("navigation", { name: "Navigasi bawah mobile" });
    expect(nav.className).toContain("safe-area-bottom-nav");
    const firstNavBtn = within(nav).getAllByRole("button")[0]!;
    expect(firstNavBtn.className).toContain("landscape-bottom-nav-btn");

    render(
      <SheetDialog open onClose={vi.fn()} title="Dialog Landscape">
        <div>Isi dialog</div>
      </SheetDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Dialog Landscape" });
    expect(dialog.className).toContain("safe-area-dialog-backdrop");
    expect((dialog.firstElementChild as HTMLElement).className).toContain("landscape-dialog-panel");
  });

  it("R5-08 (UI Integration): memilih Sapi Potong & mengubah bobot badan otomatis menampilkan target LK dan SK", async () => {
    const user = userEvent.setup();
    render(<App />);

    const commodityTrigger = screen.getByRole("combobox", { name: /Pilih komoditas ternak/i });
    await user.click(commodityTrigger);
    await user.click(screen.getByRole("option", { name: /Sapi Potong/i }));

    const bwInput = screen.getByLabelText(/Bobot badan sapi potong kg/i);
    await user.clear(bwInput);
    await user.type(bwInput, "400");

    // Target Nutrien harus menampilkan Lemak Kasar (LK) & Serat Kasar (SK) dengan batas aktif (bukan Tanpa batas)
    const targetPanel = screen.getAllByLabelText("Panel Target Nutrien")[0]!;
    expect(within(targetPanel).getByText("LK")).toBeInTheDocument();
    expect(within(targetPanel).getByText("SK")).toBeInTheDocument();
    expect(within(targetPanel).queryByText("Tanpa batas")).not.toBeInTheDocument();
  });
});
