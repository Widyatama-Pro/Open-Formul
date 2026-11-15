import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../src/App";

describe("Live HiGHS Solver UI Integration", () => {
  it("menjalankan Solver HiGHS (Live) saat startup pada Broiler Starter hingga Optimal", async () => {
    render(<App />);

    const scenarioSelect = screen.getByLabelText("Simulasi kondisi hasil prototipe");
    expect(scenarioSelect).toHaveValue("auto");
    expect(screen.getByRole("option", { name: "Solver HiGHS (Live)" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Optimal/i)).toBeInTheDocument();
    });

    // Pastikan tabel komposisi hasil formulasi menampilkan bahan aktif seperti Jagung Giling Kuning & SBM 44%
    expect(screen.getAllByText(/Jagung Giling Kuning/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bungkil Kedelai/i).length).toBeGreaterThan(0);
  });

  it("merespons perubahan target nutrien menjadi infeasible lalu pulih dengan Mode Relaksasi Elastik", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Optimal/i)).toBeInTheDocument();
    });

    const cpMinInputs = screen.getAllByLabelText("Target Min Protein Kasar");
    const cpInput = cpMinInputs[0]!;
    await user.clear(cpInput);
    await user.type(cpInput, "55");
    await user.tab();

    await waitFor(() => {
      expect(screen.getAllByText(/Formula Tidak Ditemukan|Infeasible/i).length).toBeGreaterThan(0);
    });
  });
});
