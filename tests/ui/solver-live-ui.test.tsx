import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../src/App";

describe("Live HiGHS Solver UI Integration", () => {
  it("menjalankan Solver HiGHS (Live) saat startup pada Broiler Starter hingga Optimal", async () => {
    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText(/Optimal/i)).toBeInTheDocument();
      },
      { timeout: 25000 },
    );

    expect(screen.getAllByText(/Jagung Giling Kuning/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bungkil Kedelai/i).length).toBeGreaterThan(0);
  });

  it("merespons perubahan target nutrien menjadi infeasible setelah membuka batas Min/Max", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText(/Optimal/i)).toBeInTheDocument();
      },
      { timeout: 25000 },
    );

    // Buka panel Min/Max untuk Protein Kasar (karena default-nya ringkas hanya nilai aktual)
    const expandCpBtn = screen.getByRole("button", {
      name: /Atur batas Min dan Max Protein Kasar/i,
    });
    await user.click(expandCpBtn);

    const cpMinInputs = screen.getAllByLabelText("Target Min Protein Kasar");
    const cpInput = cpMinInputs[0]!;
    await user.clear(cpInput);
    await user.type(cpInput, "55");
    await user.tab();

    await waitFor(
      () => {
        expect(screen.getAllByText(/Formula Tidak Ditemukan|Infeasible/i).length).toBeGreaterThan(
          0,
        );
      },
      { timeout: 25000 },
    );
  });
});
