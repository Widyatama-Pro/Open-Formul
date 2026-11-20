import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { IngredientLibraryPage } from "../../src/components/database/IngredientLibraryPage";
import { IngredientMobileCards } from "../../src/components/formulation/IngredientMobileCards";
import { NutrientTargetsPanel } from "../../src/components/formulation/NutrientTargetsPanel";
import { MobileNavDrawer } from "../../src/components/layout/MobileNavDrawer";
import { FeedClassIcon } from "../../src/components/ui/FeedClassIcon";
import { ThemedSelect } from "../../src/components/ui/ThemedSelect";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import type { FeedClassCode } from "../../src/types";

describe("Revisi 2 — Mode 1 Angka, Saran Bahan, ThemedSelect, & Audit Responsivitas Mobile", () => {
  it("NutrientTargetsPanel: mengganti tombol Ringkas dengan toggle Rentang vs 1 Angka & menampilkan saran bahan Ya/Tidak", async () => {
    const user = userEvent.setup();
    const onChangeMode = vi.fn();
    const onActivateSuggested = vi.fn();

    // Hanya aktifkan Jagung & Dedak agar PK jauh di bawah standar Broiler Starter (21%)
    const limitedIngredients = MOCK_INGREDIENTS.map((ing) => ({
      ...ing,
      isActive: ing.id === "corn-ground" || ing.id === "rice-bran",
    }));
    const req = MOCK_REQUIREMENTS[0]!;
    const singleConfig = { ...DEFAULT_CONFIG, targetInputMode: "single" as const };
    const evalRes = evaluateMockFormulation(limitedIngredients, req, singleConfig);

    render(
      <NutrientTargetsPanel
        requirement={req}
        allNutrients={MOCK_NUTRIENTS}
        allIngredients={limitedIngredients}
        config={singleConfig}
        result={evalRes}
        activeBasis="as_fed"
        targetInputMode="single"
        onChangeTargetInputMode={onChangeMode}
        onActivateSuggestedIngredient={onActivateSuggested}
        enableAdvance={false}
        enableDigestible={false}
        onToggleDigestible={vi.fn()}
        nutrientResults={evalRes.nutrients}
        conflicts={evalRes.conflicts ?? []}
        language="id"
        onUpdateConstraint={vi.fn()}
      />,
    );

    // Tombol lama "Ringkas" sudah diganti dengan toggle Rentang | 1 Angka
    expect(screen.queryByRole("button", { name: /^Ringkas$/i })).not.toBeInTheDocument();
    const rangeBtn = screen.getByRole("button", { name: /^Rentang$/i });
    const singleBtn = screen.getByRole("button", { name: /^1 Angka$/i });
    expect(singleBtn).toHaveAttribute("aria-pressed", "true");
    expect(rangeBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(rangeBtn);
    expect(onChangeMode).toHaveBeenCalledWith("range");

    // Kartu SK menunjukkan penanda maksimal (Maks) pada mode 1 angka
    expect(screen.getByText(/Target:\s*Maks/i)).toBeInTheDocument();

    // Saran bahan mudah didapat di Indonesia muncul dengan pilihan Ya, Masukkan & Tidak
    const advisorSection = screen.getByLabelText(/Saran bahan pakan mudah didapat di Indonesia/i);
    const yesButtons = within(advisorSection).getAllByRole("button", { name: /Masukkan saran/i });
    const noButtons = within(advisorSection).getAllByRole("button", { name: /Tolak saran/i });
    expect(yesButtons.length).toBeGreaterThan(0);
    expect(noButtons.length).toBe(yesButtons.length);

    // Klik Ya, Masukkan memanggil aktivasi bahan
    await user.click(yesButtons[0]!);
    expect(onActivateSuggested).toHaveBeenCalledTimes(1);

    // Klik Tidak menyembunyikan saran bahan tersebut dari daftar saran
    const dismissedLabel = noButtons[0]!.getAttribute("aria-label")!;
    await user.click(noButtons[0]!);
    expect(screen.queryByRole("button", { name: dismissedLabel })).not.toBeInTheDocument();
  });

  it("ThemedSelect: menampilkan bilah pencarian standar & header grup non-interaktif tanpa radio button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ThemedSelect
        ariaLabel="Standar Ternak"
        modalTitle="Pilih Standar Ternak"
        searchPlaceholder="Cari Standar…"
        searchable
        value="a1"
        onChange={onChange}
        options={[
          {
            value: "a1",
            label: "Broiler Starter SNI 8173.2:2015",
            group: "Standar SNI Unggas (2013–2017)",
          },
          {
            value: "a2",
            label: "Itik Petelur SNI 3910:2017",
            group: "Standar SNI Unggas (2013–2017)",
          },
          {
            value: "b1",
            label: "Konsentrat Sapi SNI 3148-2:2017",
            group: "Konsentrat Sapi (SNI 3148)",
          },
        ]}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Standar Ternak" });
    await user.click(trigger);

    // Header grup tampil sebagai pemisah non-interaktif (bukan role="option" / radio)
    expect(screen.getByText("Standar SNI Unggas (2013–2017)")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Standar SNI Unggas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    // Kolom Cari Standar menyaring opsi dengan cepat
    const searchInput = screen.getByPlaceholderText("Cari Standar…");
    await user.type(searchInput, "3148");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.click(screen.getByRole("option", { name: /Konsentrat Sapi/i }));
    expect(onChange).toHaveBeenCalledWith("b1");
  });

  it("IngredientLibraryPage: menyembunyikan kelas berjumlah 0 saat Semua 8 Kelas aktif, tapi menampilkannya saat chip dipilih", async () => {
    const user = userEvent.setup();
    // Subset bahan tanpa Silase (Kelas 3 = 0 bahan)
    const noSilageFeeds = MOCK_INGREDIENTS.filter(
      (i) => i.id === "corn-ground" || i.id === "sbm-44",
    );

    render(
      <IngredientLibraryPage
        ingredients={noSilageFeeds}
        language="id"
        onToggleActive={vi.fn()}
        onOpenAdd={vi.fn()}
      />,
    );

    // Filter "Semua 8 Kelas" aktif -> section Kelas 3 (Silase) yang 0 item tersembunyi otomatis
    expect(screen.queryByRole("heading", { name: /Kelas 3 · Silase/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Kelas 4 · Sumber Energi/i })).toBeInTheDocument();

    // Klik chip filter "3. Silase" secara spesifik -> state kosong muncul
    await user.click(screen.getByRole("tab", { name: /3\. Silase/i }));
    expect(screen.getByRole("heading", { name: /Kelas 3 · Silase/i })).toBeInTheDocument();
    expect(screen.getByText(/Belum ada bahan pada kelas ini/i)).toBeInTheDocument();
  });

  it("MobileNavDrawer (secondaryOnly): menghapus duplikasi menu utama bottom nav dan hanya menyisakan menu sekunder & tema", () => {
    render(
      <MobileNavDrawer
        open
        secondaryOnly
        onClose={vi.fn()}
        route="formulation"
        onNavigate={vi.fn()}
        language="id"
        theme="light"
        onToggleTheme={vi.fn()}
        onToggleLanguage={vi.fn()}
      />,
    );

    // Menu sekunder wajib ada
    expect(screen.getByRole("button", { name: /Profil Kebutuhan Ternak/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Modul Lanjutan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pengaturan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mode Gelap/i })).toBeInTheDocument();

    // Menu utama yang sudah ada di bottom nav TIDAK boleh diduplikasi
    expect(screen.queryByRole("button", { name: /Formulasi Ransum/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Database Bahan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Resep & Ekspor/i })).not.toBeInTheDocument();
  });

  it("IngredientMobileCards: judul bahan mendukung 2 baris (line-clamp-2) & metadata bawah 12px terbaca penuh", () => {
    const sample = MOCK_INGREDIENTS.filter(
      (i) => i.id === "corn-ground" || i.id === "dcp-mineral" || i.id === "limestone",
    );

    render(
      <IngredientMobileCards
        ingredients={sample}
        language="id"
        onUpdateIngredient={vi.fn()}
        onResetPriceOverride={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    const dcpHeading = screen.getByText("Dikalsium Fosfat (DCP)");
    expect(dcpHeading.className).toContain("line-clamp-2");
    expect(dcpHeading.className).not.toContain("truncate");
    expect(
      screen.getByRole("button", { name: /Edit nutrien Dikalsium Fosfat/i }),
    ).toBeInTheDocument();
  });

  it("Toolbar memakai istilah ramah peternak 'Toleransi Target' (bukan Elastik) dan FeedClassIcon merender 8 kelas kontekstual", () => {
    render(<App />);
    expect(screen.getByText(/Toleransi Target/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Elastik$/i)).not.toBeInTheDocument();

    const codes: readonly FeedClassCode[] = [1, 2, 3, 4, 5, 6, 7, 8];
    const { container } = render(
      <div>
        {codes.map((c) => (
          <FeedClassIcon key={c} code={c} language="id" />
        ))}
      </div>,
    );
    expect(container.querySelectorAll("[data-feed-class]").length).toBe(8);
  });
});
