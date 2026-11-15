import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../src/App";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_REQUIREMENTS,
  evaluateMockFormulation,
} from "../../src/data/mock-state";

describe("Open Formul Fase 1 UI Prototype Flow", () => {
  it("merender workbench formulasi default beserta daftar bahan aktif dan KPI biaya", () => {
    render(<App />);

    expect(screen.getByLabelText("Kontrol utama formulasi")).toBeInTheDocument();
    expect(screen.getByLabelText("Panel Bahan Pakan")).toBeInTheDocument();
    expect(screen.getByLabelText("Panel Target Nutrien")).toBeInTheDocument();
    expect(screen.getByLabelText("Panel Hasil Formulasi")).toBeInTheDocument();

    expect(screen.getAllByText(/Jagung Giling Kuning/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Biaya \/ kg/i)).toBeInTheDocument();
  });

  it("beralih preset ternak ke Sapi Potong otomatis mengganti basis menjadi BK (DM)", async () => {
    const user = userEvent.setup();
    render(<App />);

    const presetSelect = screen.getByLabelText(/Standar Ternak/i);
    await user.selectOptions(presetSelect, "beef-fattening");

    expect(screen.getByText("Basis: BK (DM)")).toBeInTheDocument();

    const asFedBtn = screen.getByRole("button", { name: "As-Fed" });
    await user.click(asFedBtn);
    expect(screen.getByText("Basis: As-Fed")).toBeInTheDocument();
  });

  it("toggle Mode Advance dan SID/AvP menampilkan baris asam amino lanjutan dan fraksi tercerna", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByText(/Triptofan/i)).not.toBeInTheDocument();

    const advanceSwitch = screen.getByRole("switch", {
      name: "Aktifkan Mode Presisi Tinggi Advance",
    });
    await user.click(advanceSwitch);

    expect(screen.getAllByText("Lisin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Triptofan").length).toBeGreaterThan(0);

    const sidSwitch = screen.getByRole("switch", {
      name: "Gunakan Basis Digestible SID dan AvP",
    });
    await user.click(sidSwitch);

    expect(screen.getAllByText("SID Lisin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fosfor Tersedia (AvP)").length).toBeGreaterThan(0);
  });

  it("mendeteksi ADVANCE_NULL_DATA pada evaluator saat bahan aktif memiliki nilai null di kendala Advance", () => {
    const reqWithTrp = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        ...MOCK_REQUIREMENTS[0]!.constraints,
        { nutrientId: "trp", min: 0.2, isAdvance: true, enabled: true },
      ],
    };
    const res = evaluateMockFormulation(MOCK_INGREDIENTS, reqWithTrp, {
      ...DEFAULT_CONFIG,
      enableAdvanceNutrients: true,
    });
    const nullConflict = res.conflicts?.find((c) => c.code === "ADVANCE_NULL_DATA");
    expect(nullConflict).toBeDefined();
    expect(nullConflict?.message).toContain("Dedak Padi Halus");
  });

  it("mengubah ukuran batch 500 kg dan menavigasi sub-tab Grafik, Shadow Price, What-If", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "500 kg" }));
    expect(screen.getByText("Biaya / 500 kg")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Grafik" }));
    expect(screen.getByText(/Radar Target Ideal vs Aktual/i)).toBeInTheDocument();
    expect(screen.getByText(/Porsi Berat \(%\) vs Porsi Biaya \(%\)/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Shadow Price" }));
    expect(screen.getByText(/Shadow Price Kendala Nutrisi \(Dual Value\)/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "What-If" }));
    expect(screen.getByText(/Simulasi Tukar Bahan Cepat/i)).toBeInTheDocument();
  });

  it("menampilkan banner near_feasible dan infeasible beserta saran perbaikan saat skenario demo diubah", async () => {
    const user = userEvent.setup();
    render(<App />);

    const demoSelect = screen.getByLabelText("Simulasi kondisi hasil prototipe");

    await user.selectOptions(demoSelect, "near_feasible");
    expect(screen.getByText("Near-Feasible (Elastik)")).toBeInTheDocument();
    expect(screen.getByText(/Protein Kasar meleset/i)).toBeInTheDocument();

    await user.selectOptions(demoSelect, "infeasible");
    expect(screen.getAllByText("Infeasible").length).toBeGreaterThan(0);
    expect(screen.getByText(/Target Protein Kasar \(Min 26%\)/i)).toBeInTheDocument();
  });

  it("bernavigasi antar halaman Database Bahan, Resep & Ekspor, dan Pengaturan Bahasa/Tema", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /Database Bahan/i })[0]!);
    expect(
      screen.getByRole("heading", { name: /Database Kandungan Bahan Pakan/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tambah Bahan/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Resep & Ekspor/i })[0]!);
    expect(screen.getByRole("heading", { name: /Proyek & Resep Tersimpan/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Pengaturan/i })[0]!);
    await user.selectOptions(screen.getByLabelText("Pilih bahasa"), "en");
    expect(screen.getByRole("heading", { name: "Application Settings" })).toBeInTheDocument();
  });
});
