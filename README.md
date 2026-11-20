# OpenFormul 🌾 — Offline-first least-cost feed formulation in your browser

<p align="center">
  <img src="assets/banner.jpg" alt="OpenFormul — Precision Feed Optimization" width="100%">
</p>

<p align="center">
  <a href="https://github.com/Widyatama-Pro/OpenFormul/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Widyatama-Pro/OpenFormul/ci.yml?branch=main&style=flat-square&label=CI" alt="CI Status"></a>
  <a href="https://github.com/Widyatama-Pro/OpenFormul/releases"><img src="https://img.shields.io/github/v/release/Widyatama-Pro/OpenFormul?include_prereleases&style=flat-square" alt="Releases"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-059669?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Solver-HiGHS%20WASM-0F3D3E?style=flat-square" alt="HiGHS WASM">
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square" alt="TypeScript Strict">
  <img src="https://img.shields.io/badge/PWA-Offline--First-059669?style=flat-square" alt="PWA Offline-First">
</p>

**OpenFormul** is a client-side least-cost ration formulation engine powered by Linear Programming (HiGHS WebAssembly). It runs as an installable PWA in any modern browser, a native Windows desktop app via Tauri v2, and an offline Android app via Capacitor 8. Drop straight into existing spreadsheet and mill workflows with multi-cell TSV paste, CSV partial-merge, multi-sheet `.xlsx`, print-ready PDF 1.4 (`full` and `batch_only`), and portable `.feed.json` files. Under the hood, a pure TypeScript model builder compiles nutrient, ratio, and inclusion constraints into LP strings and solves them off the main thread in a Web Worker.

**Yours, with no catch.** Every ingredient catalog, custom price override, nutrient standard, and saved ration stays on your device in IndexedDB (`openformul-db`) with a precached `.wasm` Service Worker for zero-connectivity field work. No cloud account, no external solver API, and zero telemetry leave your machine. Open-source MIT code you can audit, fork, and run in air-gapped feed mills or research labs.

---

## Quick Start

Requires **Node.js >= 20** and **npm >= 10**.

```bash
git clone https://github.com/Widyatama-Pro/OpenFormul.git
cd OpenFormul
npm install
npm run dev
```

Verification suite:

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test
npm run build
```

## Live App & Installers

- **Web / PWA (GitHub Pages):** [`https://widyatama-pro.github.io/OpenFormul/`](https://widyatama-pro.github.io/OpenFormul/)
- **Windows Desktop (`.exe`):** `OpenFormul-Windows-x64-setup.exe` via [GitHub Releases](https://github.com/Widyatama-Pro/OpenFormul/releases) (Tauri v2 + WebView2, native file save dialogs)
- **Android (`.apk`):** `OpenFormul-Android.apk` via [GitHub Releases](https://github.com/Widyatama-Pro/OpenFormul/releases) (Capacitor 8, local HiGHS WASM + native share/export)
- **Portable Offline ZIP:** `openformul-offline-portable.zip` (`start-windows.bat` / `start-mac-linux.sh`)

## Core Capabilities

- **HiGHS LP/SLP Solver in Web Worker:** 5 optimization modes (including Mode 5 Chebyshev minimax $\epsilon$-lexicographic), **Range vs Single-Target Precision (`1 Angka`)** goal-programming mode (strict upper cap on Crude Fiber `cf` while approaching closely) paired with an **Indonesian Feed Availability Advisor** (`src/solver/ingredientAdvisor.ts`, optional **Yes/No** suggestions prioritizing locally accessible Indonesian feeds), priority-tiered L1 flexible-bound relaxation (`Toleransi Target` / `near_feasible`), Chinneck minimal IIS diagnostics, RHS validity ranges & directional duals, parametric Buy/No-Buy price ladder, Dinkelbach fractional cost-per-nutrient LP, Munford/Cantelli stochastic chance constraints, and sub-additive multi-enzyme matrices.
- **Consistent Nutritional Basis & Rumen Biology:** Automatic As-Fed ↔ Dry Matter (BK/DM) normalization (including stochastic $\sigma$ scaling), linearized nutrient ratios (`Ca:P`), active `dEB`/`DCAD` electrolyte balance, post-solve CNCPS v6.5 / NASEM 2021 rumen evaluation (`peuNDF240`, `DMI`, `kp`, `MCP`, `eCH4`), strict `0` vs `N/A` (`null`) distinction, and full custom nutrient definitions.
- **Built-in Reference Libraries & Full Bilingual UI (`ID / EN`):** 304 feeds from Hartadi 1980 grouped into the 8 standard International Feed Classes (`src/data/feed-classes.ts`), **22 official SNI livestock requirement profiles** with publication years (`src/data/sni-requirements.ts`: SNI 8173:2015, 8290:2016, 7783:2013, 3908–3910:2017, 3148:2017, 8819:2019), 82 Kearl 1982 profiles, and 24 NRC 1988 dairy profiles archived under [`docs/references/`](docs/references/), plus complete Indonesian/English localization (`src/i18n/`).
- **Farmer-Focused Desktop, Mobile & Android Workbench, 3-Layer Acrylic Glass UI Enhancer & PDF Reporting:** Clean **OpenFormul** header synced across PWA, Tauri `.exe`, & Android edge-to-edge system bars (`MainActivity.java` `OpenFormulSystemBars` bridge + `shortEdges` notch safe-area insets + Android landscape compact ergonomics), **UI Enhancer (Glassmorphism & Volumetric Glow Mode)** across all 7 color palettes × Light/Dark (14 variants + Android OLED `#000000`) featuring an ambient mesh canvas, top-right palette-tinted ambient glassmorphism wave backdrop, layered sidebar with 1.5x prominent **Formulasi Ransum** primary hub & glowing active pill, `TrakteerSupportButton` creator support badge, 3-layer acrylic glass panels (translucent frosted blur, `1.2px` specular rim light, palette-tinted shadows), **120 FPS Rendering & Motion Engine** (`ultra` | `balanced` | `crisp`, `gpu_flip` | `css_native`, custom blur `0–32px` & glow `0–150%` sliders, `interpolate-size: allow-keywords`, non-blocking top-right floating solving toast, and `AnimatedTextSwap`), toggleable **Abbreviated vs Full Nutrient Names (`PK, EM, LK, SK` vs `Protein Kasar, …`, default: Abbreviated)**, custom theme-matched searchable **Standar Ternak** selector (`ThemedSelect` with non-interactive section dividers & chevron trigger), 4 core commodities (**Ayam Pedaging**, **Ayam Petelur**, **Sapi Potong** & **Sapi Perah** dynamic Kearl 1982 / NRC 1988 calculators including sourced `ee`/LK & `cf`/SK targets) + **Lainnya…**, 3-tier **Pakan yang Digunakan** & **Database Bahan** grids (**Dasar | Standar | Lanjutan** + **Kolom** popover, species-adaptive `EM` vs `TDN` slot, swipeable horizontal table scroll on mobile, contextual 8-class **FeedClassIcon** badges, horizontally scrollable class tabs, optional **BETN**) and virtualized **Daftar Semua Bahan**, mobile feed cards (`IngredientMobileCards`) showing all basic nutrients (`PK`, `EM`/`TDN`, `LK`, `SK`, `Ca`, `P`, `BK`, `Pasar`) with toggleable `Min % / Max %` inputs, symmetric nutrient target-proximity progress meters (`computeNutrientProximityMeter`: 100% when exact/in-range, proportional reduction with amber/danger indicators when under or over), solid native-feeling non-selectable chrome & Android text with `.selectable-panel` data selection on desktop PC, integrated **Capaian Nutrien Hasil Formulasi (Target vs Aktual & Status)** summary in `Komposisi & Batch`, responsive mobile cards in `ShadowPriceTab`, official GitHub Releases update checker in Settings, collapsible mobile top controls + sticky step tabs (`1. Bahan | 2. Target | 3. Hasil`), and crisp light-paper PDF 1.4 exports (`full`, `batch_only`, database, saved recipes).

## Architecture

```mermaid
flowchart LR
  UI["React UI (Grid & Targets)"] --> Builder["Pure LP Builder (src/solver)"]
  Builder --> Worker["Web Worker: HiGHS WASM"]
  Worker --> Result["Verified FormulationResult"]
  Result --> UI
  UI <--> IDB[("IndexedDB (openformul-db)")]
```

```text
src/
├── components/   # 3-layer Acrylic Glass UI, formulation grid, precision LP modal, analytics, Settings UI Enhancer & Engine controls, Trakteer badge, export dialogs
├── data/         # Sample JSON, 8 IFN feed classes, SNI standards (22), Hartadi 1980 (304), Kearl 1982 (82), NRC 1988 (24)
├── hooks/        # Store orchestration & PWA lifecycle hooks
├── i18n/         # Full ID / EN localization helpers & conflict translators
├── solver/       # Pure LP/SLP builder, IIS, stepping, stochastic, enzymes, rumen evaluator, HiGHS worker
├── storage/      # IndexedDB (idb), .feed.json, CSV/OOXML .xlsx, PDF 1.4 generators
├── theme/        # 7-palette × Light/Dark (14 variants + UI Enhancer Acrylic/Glow + AMOLED) tokens, 120 FPS Rendering/Motion settings, PWA & Android system bar sync
├── types/        # Canonical domain TypeScript types
└── utils/        # Basis math, nutrition equations, validators, TSV paste
```

## Documentation & Contributing

- **Docs:** [docs/architecture.md](docs/architecture.md) · [docs/formulation-math.md](docs/formulation-math.md) · [docs/data-schema.md](docs/data-schema.md) · [docs/prd.md](docs/prd.md) · [docs/ROADMAP.md](docs/ROADMAP.md)
- **Contributing:** Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a PR.
- **Security:** Report client-side, parser, or WASM issues privately via [SECURITY.md](SECURITY.md).

> **Disclaimer:** Formulation outputs depend on the accuracy of entered nutrient and price data. Validate rations against laboratory assays and qualified animal nutritionists before commercial mixing.

## License

[MIT](LICENSE) © 2026 Reza Widya Utama and contributors.
