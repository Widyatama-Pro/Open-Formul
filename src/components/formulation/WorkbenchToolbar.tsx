import { memo, useEffect, useMemo, useState } from "react";
import {
  BookmarkPlus,
  Calculator,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RotateCcw,
} from "lucide-react";
import { getFormulationStatusLabel, pickLang } from "../../i18n";
import type {
  AppLanguage,
  Basis,
  FormulationConfig,
  FormulationResult,
  OptimizationMode,
  Requirement,
} from "../../types";
import {
  computeDynamicBeefRequirement,
  computeDynamicDairyRequirement,
  type BeefPhysiologicalState,
  type DairyStandard,
} from "../../utils/cattle-requirements";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import type { CommodityGroup } from "../../utils/species";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Switch";
import { ThemedSelect, type ThemedSelectOption } from "../ui/ThemedSelect";
import { OptimizationModeSelector } from "./OptimizationModeSelector";

export interface WorkbenchToolbarProps {
  readonly requirements: readonly Requirement[];
  readonly activeRequirement: Requirement;
  readonly config: FormulationConfig;
  readonly result: FormulationResult;
  readonly language: AppLanguage;
  readonly inspectorOpen: boolean;
  readonly mobileCollapsed?: boolean;
  readonly onToggleMobileCollapsed?: () => void;
  readonly onToggleInspector: () => void;
  readonly onSelectPreset: (id: string) => void;
  readonly onApplyDynamicRequirement: (req: Requirement) => void;
  readonly onSetBasis: (basis: Basis) => void;
  readonly onSetMode: (mode: OptimizationMode) => void;
  readonly onToggleElastic: (enabled: boolean) => void;
  readonly onOpenSaveDialog: () => void;
  readonly onOpenExportDialog: () => void;
  readonly onResetMock: () => void;
}

interface OtherRequirementGroups {
  readonly poultryOther: readonly Requirement[];
  readonly goatSheep: readonly Requirement[];
  readonly concentrateSni: readonly Requirement[];
  readonly staticCattle: readonly Requirement[];
  readonly custom: readonly Requirement[];
}

function resolveInitialCommodity(req: Requirement): CommodityGroup {
  if (req.id === "dynamic-beef") return "cattle_beef";
  if (req.id === "dynamic-dairy") return "cattle_dairy";
  if (req.species === "broiler") return "broiler";
  if (req.species === "layer") return "layer";
  return "other";
}

function groupOtherRequirements(requirements: readonly Requirement[]): OtherRequirementGroups {
  const poultryOther: Requirement[] = [];
  const goatSheep: Requirement[] = [];
  const concentrateSni: Requirement[] = [];
  const staticCattle: Requirement[] = [];
  const custom: Requirement[] = [];

  for (const req of requirements) {
    if (req.species === "broiler" || req.species === "layer") continue;
    if (req.species === "buras" || req.species === "duck") {
      poultryOther.push(req);
    } else if (req.species === "sheep" || req.species === "goat" || req.species === "goat_sheep") {
      goatSheep.push(req);
    } else if (req.id.startsWith("sni-3148")) {
      concentrateSni.push(req);
    } else if (
      req.id === "beef-fattening" ||
      req.id.startsWith("kearl") ||
      req.id.startsWith("nrc88-")
    ) {
      staticCattle.push(req);
    } else {
      custom.push(req);
    }
  }

  return { poultryOther, goatSheep, concentrateSni, staticCattle, custom };
}

/**
 * Toolbar & KPI strip ringkas untuk Workbench Formulasi (Desktop & Mobile Collapsible):
 * - Standar Ternak menggunakan ThemedSelect modern (seragam tema UI, pencarian standar, & section divider non-interaktif)
 * - Mode Toleransi Target (nama ramah peternak menggantikan istilah "Elastik")
 * - Pada layar HP (< lg), ringkas dan dapat dilipat (collapsible) agar daftar bahan/target memiliki 75–80%+ ruang layar
 */
export const WorkbenchToolbar = memo(function WorkbenchToolbar({
  requirements,
  activeRequirement,
  config,
  result,
  language,
  inspectorOpen,
  mobileCollapsed = false,
  onToggleMobileCollapsed,
  onToggleInspector,
  onSelectPreset,
  onApplyDynamicRequirement,
  onSetBasis,
  onSetMode,
  onToggleElastic,
  onOpenSaveDialog,
  onOpenExportDialog,
  onResetMock,
}: WorkbenchToolbarProps) {
  const [commodity, setCommodity] = useState<CommodityGroup>(() =>
    resolveInitialCommodity(activeRequirement),
  );

  // Sapi Potong dynamic state
  const [beefState, setBeefState] = useState<BeefPhysiologicalState>("growth");
  const [beefBw, setBeefBw] = useState<number>(300);
  const [beefAdg, setBeefAdg] = useState<number>(0.8);

  // Sapi Perah dynamic state
  const [dairyBw, setDairyBw] = useState<number>(450);
  const [dairyMilk, setDairyMilk] = useState<number>(15);
  const [dairyFat, setDairyFat] = useState<number>(3.8);
  const [dairyStandard, setDairyStandard] = useState<DairyStandard>("kearl_1982");
  const [dairyDry, setDairyDry] = useState<boolean>(false);

  useEffect(() => {
    setCommodity(resolveInitialCommodity(activeRequirement));
  }, [activeRequirement]);

  const broilerReqs = useMemo(
    () => requirements.filter((r) => r.species === "broiler"),
    [requirements],
  );
  const layerReqs = useMemo(
    () => requirements.filter((r) => r.species === "layer"),
    [requirements],
  );
  const otherGroups = useMemo(() => groupOtherRequirements(requirements), [requirements]);

  const commodityOptions = useMemo<readonly ThemedSelectOption[]>(
    () => [
      { value: "broiler", label: pickLang(language, "Ayam Pedaging", "Broiler") },
      { value: "layer", label: pickLang(language, "Ayam Petelur", "Layer") },
      { value: "cattle_beef", label: pickLang(language, "Sapi Potong", "Beef Cattle") },
      { value: "cattle_dairy", label: pickLang(language, "Sapi Perah", "Dairy Cattle") },
      { value: "other", label: pickLang(language, "Lainnya…", "Others…") },
    ],
    [language],
  );

  const broilerOptions = useMemo<readonly ThemedSelectOption[]>(
    () =>
      broilerReqs.map((req) => ({
        value: req.id,
        label: language === "id" ? req.name : (req.nameEn ?? req.name),
        group: pickLang(language, "Standar Ayam Pedaging (SNI / NRC)", "Broiler Standards"),
      })),
    [broilerReqs, language],
  );

  const layerOptions = useMemo<readonly ThemedSelectOption[]>(
    () =>
      layerReqs.map((req) => ({
        value: req.id,
        label: language === "id" ? req.name : (req.nameEn ?? req.name),
        group: pickLang(language, "Standar Ayam Petelur (SNI / NRC)", "Layer Standards"),
      })),
    [layerReqs, language],
  );

  const otherPresetOptions = useMemo<readonly ThemedSelectOption[]>(() => {
    const list: ThemedSelectOption[] = [];
    const pushGroup = (groupLabel: string, items: readonly Requirement[]) => {
      for (const req of items) {
        list.push({
          value: req.id,
          label: language === "id" ? req.name : (req.nameEn ?? req.name),
          group: groupLabel,
        });
      }
    };
    if (otherGroups.custom.length > 0) {
      pushGroup(
        pickLang(language, "Profil Kustom Anda", "Your Custom Profiles"),
        otherGroups.custom,
      );
    }
    if (otherGroups.poultryOther.length > 0) {
      pushGroup(
        pickLang(language, "Unggas Lain (Buras & Itik SNI)", "Native & Duck (SNI)"),
        otherGroups.poultryOther,
      );
    }
    if (otherGroups.goatSheep.length > 0) {
      pushGroup(
        pickLang(language, "Kambing & Domba (SNI / Kearl)", "Goat & Sheep"),
        otherGroups.goatSheep,
      );
    }
    if (otherGroups.concentrateSni.length > 0) {
      pushGroup(
        pickLang(language, "Konsentrat Sapi (SNI 3148)", "Concentrate SNI"),
        otherGroups.concentrateSni,
      );
    }
    if (otherGroups.staticCattle.length > 0) {
      pushGroup(
        pickLang(
          language,
          "Tabel Statis Lengkap (Kearl 1982 / NRC 1988)",
          "Full Static Tables (Kearl / NRC)",
        ),
        otherGroups.staticCattle,
      );
    }
    return list;
  }, [otherGroups, language]);

  const beefStateOptions = useMemo<readonly ThemedSelectOption[]>(
    () => [
      { value: "growth", label: pickLang(language, "Tumbuh / Gemuk", "Grow / Finish") },
      {
        value: "gestation_heifer",
        label: pickLang(language, "Dara Bunting 3 Bln", "Pregnant Heifer"),
      },
      {
        value: "gestation_cow",
        label: pickLang(language, "Induk Bunting 3 Bln", "Pregnant Cow"),
      },
      {
        value: "work_moderate",
        label: pickLang(language, "Kerja Sedang (4j)", "Moderate Work"),
      },
      { value: "work_heavy", label: pickLang(language, "Kerja Berat (8j)", "Heavy Work") },
    ],
    [language],
  );

  const beefPreview = useMemo(
    () =>
      computeDynamicBeefRequirement({
        bodyWeightKg: beefBw,
        adgKgPerDay: beefAdg,
        physiologicalState: beefState,
      }),
    [beefBw, beefAdg, beefState],
  );

  const dairyPreview = useMemo(
    () =>
      computeDynamicDairyRequirement({
        bodyWeightKg: dairyBw,
        milkKgPerDay: dairyMilk,
        fatPct: dairyFat,
        standard: dairyStandard,
        isDryPregnant: dairyDry,
      }),
    [dairyBw, dairyMilk, dairyFat, dairyStandard, dairyDry],
  );

  const handleCommodityChange = (next: CommodityGroup) => {
    setCommodity(next);
    if (next === "broiler") {
      const target = broilerReqs.find((r) => r.id === activeRequirement.id) ?? broilerReqs[0];
      if (target) onSelectPreset(target.id);
    } else if (next === "layer") {
      const target = layerReqs.find((r) => r.id === activeRequirement.id) ?? layerReqs[0];
      if (target) onSelectPreset(target.id);
    } else if (next === "cattle_beef") {
      onApplyDynamicRequirement(beefPreview.requirement);
    } else if (next === "cattle_dairy") {
      onApplyDynamicRequirement(dairyPreview.requirement);
    } else {
      const fallback =
        otherGroups.poultryOther[0] ??
        otherGroups.concentrateSni[0] ??
        otherGroups.goatSheep[0] ??
        otherGroups.staticCattle[0] ??
        otherGroups.custom[0];
      if (fallback) onSelectPreset(fallback.id);
    }
  };

  const applyBeefUpdate = (nextBw: number, nextAdg: number, nextState: BeefPhysiologicalState) => {
    setBeefBw(nextBw);
    setBeefAdg(nextAdg);
    setBeefState(nextState);
    const computed = computeDynamicBeefRequirement({
      bodyWeightKg: nextBw,
      adgKgPerDay: nextAdg,
      physiologicalState: nextState,
    });
    onApplyDynamicRequirement(computed.requirement);
  };

  const applyDairyUpdate = (
    nextBw: number,
    nextMilk: number,
    nextFat: number,
    nextStd: DairyStandard,
    nextDry: boolean,
  ) => {
    setDairyBw(nextBw);
    setDairyMilk(nextMilk);
    setDairyFat(nextFat);
    setDairyStandard(nextStd);
    setDairyDry(nextDry);
    const computed = computeDynamicDairyRequirement({
      bodyWeightKg: nextBw,
      milkKgPerDay: nextMilk,
      fatPct: nextFat,
      standard: nextStd,
      isDryPregnant: nextDry,
    });
    onApplyDynamicRequirement(computed.requirement);
  };

  const statusBadge =
    result.status === "optimal" ? (
      <Badge tone="emerald">{getFormulationStatusLabel(language, "optimal")}</Badge>
    ) : result.status === "near_feasible" ? (
      <Badge tone="amber">{getFormulationStatusLabel(language, "near_feasible")}</Badge>
    ) : (
      <Badge tone="rose">{getFormulationStatusLabel(language, result.status)}</Badge>
    );

  return (
    <section
      aria-label={pickLang(language, "Kontrol utama formulasi", "Main formulation controls")}
      className="flex shrink-0 flex-col justify-center gap-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 lg:min-h-[80px] lg:gap-2 lg:px-5 lg:py-2.5"
    >
      {/* Baris 1: Judul + Aksi + KPI Ringkas (2 sub-baris rapi di HP agar KPI tak terpecah, 1 baris di desktop) */}
      <div className="flex flex-col gap-1.5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-3 lg:gap-y-1.5">
        <div className="flex min-w-0 items-center justify-between gap-1.5 lg:contents">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:order-1 lg:flex-none lg:shrink-0 lg:gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--border-subtle)] lg:h-7 lg:w-7"
            >
              <Calculator className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </span>
            <h1 className="truncate text-[13px] font-extrabold tracking-tight text-[var(--text-primary)] sm:text-sm lg:text-[17px]">
              {pickLang(language, "Formulasi Ransum", "Ration Formulation")}
            </h1>
          </div>

          {/* Tombol Aksi Ringkas (sejajar judul di HP, di sisi kanan di desktop) */}
          <div className="flex shrink-0 items-center gap-1 lg:order-3 lg:ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenExportDialog}
              className="!min-h-8 gap-1 px-2 text-[11px] lg:!min-h-7 lg:px-2.5"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {pickLang(language, "Ekspor PDF", "Export PDF")}
              </span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenSaveDialog}
              className="!min-h-8 gap-1 px-2 text-[11px] lg:!min-h-7 lg:px-2.5"
            >
              <BookmarkPlus className="h-3.5 w-3.5 shrink-0" />
              <span>{pickLang(language, "Simpan", "Save")}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetMock}
              aria-label={pickLang(language, "Reset data prototipe", "Reset sample data")}
              title={pickLang(language, "Reset ke data awal", "Reset to initial data")}
              className="neu-pill-btn !min-h-8 w-8 rounded-lg px-0 lg:!min-h-7 lg:w-auto lg:px-2"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            </Button>

            {/* Tombol Lipat / Buka Kontrol di Mobile (< lg) */}
            {onToggleMobileCollapsed && (
              <span className="inline-flex lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMobileCollapsed}
                  aria-expanded={!mobileCollapsed}
                  aria-label={
                    mobileCollapsed
                      ? pickLang(
                          language,
                          "Buka pengaturan standar ternak",
                          "Expand livestock controls",
                        )
                      : pickLang(
                          language,
                          "Lipat pengaturan standar ternak",
                          "Collapse livestock controls",
                        )
                  }
                  className="neu-pill-btn !min-h-8 w-8 rounded-lg px-0 text-[10px]"
                >
                  {mobileCollapsed ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                  )}
                </Button>
              </span>
            )}

            <span className="hidden lg:inline-flex">
              <Button
                variant="secondary"
                size="sm"
                onClick={onToggleInspector}
                aria-expanded={inspectorOpen}
                aria-label={
                  inspectorOpen
                    ? pickLang(
                        language,
                        "Sembunyikan panel target nutrien",
                        "Hide nutrient targets panel",
                      )
                    : pickLang(
                        language,
                        "Tampilkan panel target nutrien",
                        "Show nutrient targets panel",
                      )
                }
                title={
                  inspectorOpen
                    ? pickLang(
                        language,
                        "Sembunyikan panel target nutrien",
                        "Hide nutrient targets panel",
                      )
                    : pickLang(
                        language,
                        "Tampilkan panel target nutrien",
                        "Show nutrient targets panel",
                      )
                }
                className="min-h-7 px-2.5 text-[11px]"
              >
                {inspectorOpen ? (
                  <>
                    <span>{pickLang(language, "Tutup Target", "Hide Targets")}</span>
                    <ChevronsRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                  </>
                ) : (
                  <>
                    <ChevronsLeft className="h-3.5 w-3.5 shrink-0 text-[var(--status-success)]" />
                    <span>{pickLang(language, "Target Nutrien", "Nutrient Targets")}</span>
                  </>
                )}
              </Button>
            </span>
          </div>
        </div>

        {/* KPI biaya compact 1 baris rapi (tanpa teks patah vertikal di HP) */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 lg:order-2 lg:border-l lg:border-[var(--border-subtle)] lg:pl-3">
          <div className="flex shrink-0 items-baseline gap-1 whitespace-nowrap">
            <span className="text-[10px] font-medium text-[var(--text-muted)] lg:text-[11px]">
              {pickLang(language, "Biaya / kg", "Cost / kg")}
              <span className="hidden sm:inline">
                {" "}
                ({result.basis === "as_fed" ? "As-Fed" : pickLang(language, "BK", "DM")})
              </span>
            </span>
            <span className="text-xs font-bold tabular-nums text-[var(--status-warning)] lg:text-sm">
              {result.costPerKg !== null ? formatCurrencyIdr(result.costPerKg) : "—"}
            </span>
          </div>

          <div className="flex shrink-0 items-baseline gap-1 border-l border-[var(--border-subtle)] pl-2.5 whitespace-nowrap">
            <span className="text-[10px] font-medium text-[var(--text-muted)] lg:text-[11px]">
              {pickLang(language, "Biaya", "Cost")} / {config.batchSizeKg} kg
            </span>
            <span className="text-xs font-bold tabular-nums text-[var(--status-success)] lg:text-sm">
              {result.batchTotalCost !== null && result.batchTotalCost !== undefined
                ? formatCurrencyIdr(result.batchTotalCost)
                : "—"}
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0 sm:border-l sm:border-[var(--border-subtle)] sm:pl-2.5">
            {statusBadge}
            <label
              title={pickLang(
                language,
                "Izinkan sedikit toleransi batas jika target nutrisi terlalu ketat agar aplikasi tetap mengeluarkan racikan terdekat.",
                "Allow slight bound tolerance when targets are too tight so the solver still outputs the closest feasible ration.",
              )}
              className="hidden cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] sm:inline-flex"
            >
              <Switch
                checked={config.enableElasticFallback}
                onCheckedChange={onToggleElastic}
                label={pickLang(
                  language,
                  "Aktifkan toleransi batas saat target terlalu ketat",
                  "Enable flexible bounds when targets are too tight",
                )}
              />
              <span>{pickLang(language, "Toleransi Target", "Flexible Bounds")}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Baris 2: Standar Ternak, Basis & Mode (Collapsible pada mobile, selalu terbuka di desktop) */}
      <div
        className={cn(
          "flex flex-col gap-1.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-2.5",
          mobileCollapsed && "hidden lg:flex",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 items-center gap-1.5">
            <label
              htmlFor="commodity-select"
              className="shrink-0 text-[11px] font-semibold whitespace-nowrap text-[var(--text-secondary)]"
            >
              {pickLang(language, "Standar Ternak", "Livestock")}
            </label>
            <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
              <ThemedSelect
                id="commodity-select"
                ariaLabel={pickLang(
                  language,
                  "Pilih komoditas ternak",
                  "Select livestock commodity",
                )}
                modalTitle={pickLang(
                  language,
                  "Pilih Komoditas Ternak",
                  "Select Livestock Commodity",
                )}
                value={commodity}
                options={commodityOptions}
                language={language}
                popoverMinWidthPx={210}
                onChange={(v) => handleCommodityChange(v as CommodityGroup)}
                className="h-8 min-h-8 py-0 text-[11px] font-semibold md:h-7 md:min-h-7"
              />
            </div>
          </div>

          {/* 1. Ayam Pedaging -> per fase */}
          {commodity === "broiler" && (
            <div className="min-w-0 w-full sm:w-64">
              <ThemedSelect
                id="preset-select"
                ariaLabel={pickLang(language, "Fase Ayam Pedaging", "Broiler Phase")}
                modalTitle={pickLang(
                  language,
                  "Pilih Standar Ayam Pedaging",
                  "Select Broiler Standard",
                )}
                searchPlaceholder={pickLang(
                  language,
                  "Cari standar broiler…",
                  "Search broiler standard…",
                )}
                searchable
                value={
                  broilerReqs.some((r) => r.id === activeRequirement.id)
                    ? activeRequirement.id
                    : (broilerReqs[0]?.id ?? "")
                }
                options={broilerOptions}
                language={language}
                popoverMinWidthPx={310}
                onChange={onSelectPreset}
                className="h-8 min-h-8 py-0 text-[11px] md:h-7 md:min-h-7"
              />
            </div>
          )}

          {/* 2. Ayam Petelur -> tiap fase pilihan */}
          {commodity === "layer" && (
            <div className="min-w-0 w-full sm:w-68">
              <ThemedSelect
                id="preset-select"
                ariaLabel={pickLang(language, "Fase Ayam Petelur", "Layer Phase")}
                modalTitle={pickLang(
                  language,
                  "Pilih Standar Ayam Petelur",
                  "Select Layer Standard",
                )}
                searchPlaceholder={pickLang(
                  language,
                  "Cari standar layer…",
                  "Search layer standard…",
                )}
                searchable
                value={
                  layerReqs.some((r) => r.id === activeRequirement.id)
                    ? activeRequirement.id
                    : (layerReqs[0]?.id ?? "")
                }
                options={layerOptions}
                language={language}
                popoverMinWidthPx={320}
                onChange={onSelectPreset}
                className="h-8 min-h-8 py-0 text-[11px] md:h-7 md:min-h-7"
              />
            </div>
          )}

          {/* 3. Sapi Potong -> Status + Bobot Badan + Target PBBH */}
          {commodity === "cattle_beef" && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
                <ThemedSelect
                  ariaLabel={pickLang(language, "Status fisiologis sapi potong", "Beef status")}
                  modalTitle={pickLang(
                    language,
                    "Status Fisiologis Sapi Potong",
                    "Beef Physiological Status",
                  )}
                  value={beefState}
                  options={beefStateOptions}
                  language={language}
                  popoverMinWidthPx={220}
                  onChange={(v) => applyBeefUpdate(beefBw, beefAdg, v as BeefPhysiologicalState)}
                  className="h-8 min-h-8 py-0 text-[11px] md:h-7 md:min-h-7"
                />
              </div>

              <label className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
                <span>{pickLang(language, "BB", "BW")}</span>
                <Input
                  numeric
                  type="number"
                  min={80}
                  max={900}
                  step={10}
                  value={beefBw}
                  aria-label={pickLang(
                    language,
                    "Bobot badan sapi potong kg",
                    "Beef body weight kg",
                  )}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0) applyBeefUpdate(v, beefAdg, beefState);
                  }}
                  className="h-7 min-h-7 w-16 px-1.5 py-0 text-[11px] md:min-h-7"
                />
                <span>kg</span>
              </label>

              {beefState === "growth" && (
                <label className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  <span>{pickLang(language, "PBBH", "ADG")}</span>
                  <Input
                    numeric
                    type="number"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={beefAdg}
                    aria-label={pickLang(language, "Target PBBH kg per hari", "Target ADG kg/day")}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 0) applyBeefUpdate(beefBw, v, beefState);
                    }}
                    className="h-7 min-h-7 w-16 px-1.5 py-0 text-[11px] md:min-h-7"
                  />
                  <span>kg/hr</span>
                </label>
              )}

              <Badge
                tone={beefPreview.isExtrapolated ? "amber" : "emerald"}
                title={beefPreview.sourceLabel}
              >
                DMI {formatNumberLocale(beefPreview.dmiKg, 1)} kg ·{" "}
                {beefPreview.isExtrapolated
                  ? pickLang(language, "Ekstrapolasi", "Extrapolated")
                  : pickLang(language, "Interpolasi", "Interpolated")}
              </Badge>
            </div>
          )}

          {/* 4. Sapi Perah -> Bobot + Target Susu + Lemak */}
          {commodity === "cattle_dairy" && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <label className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
                <span>{pickLang(language, "BB", "BW")}</span>
                <Input
                  numeric
                  type="number"
                  min={200}
                  max={900}
                  step={10}
                  value={dairyBw}
                  aria-label={pickLang(
                    language,
                    "Bobot badan sapi perah kg",
                    "Dairy body weight kg",
                  )}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0) {
                      applyDairyUpdate(v, dairyMilk, dairyFat, dairyStandard, dairyDry);
                    }
                  }}
                  className="h-7 min-h-7 w-16 px-1.5 py-0 text-[11px] md:min-h-7"
                />
                <span>kg</span>
              </label>

              {!dairyDry && (
                <>
                  <label className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
                    <span>{pickLang(language, "Susu", "Milk")}</span>
                    <Input
                      numeric
                      type="number"
                      min={1}
                      max={65}
                      step={1}
                      value={dairyMilk}
                      aria-label={pickLang(
                        language,
                        "Target produksi susu liter per hari",
                        "Milk yield L/day",
                      )}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v >= 0) {
                          applyDairyUpdate(dairyBw, v, dairyFat, dairyStandard, dairyDry);
                        }
                      }}
                      className="h-7 min-h-7 w-14 px-1.5 py-0 text-[11px] md:min-h-7"
                    />
                    <span>L</span>
                  </label>

                  <label className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
                    <span>{pickLang(language, "Lemak", "Fat")}</span>
                    <Input
                      numeric
                      type="number"
                      min={2.5}
                      max={6.0}
                      step={0.1}
                      value={dairyFat}
                      aria-label={pickLang(language, "Kadar lemak susu persen", "Milk fat %")}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v > 0) {
                          applyDairyUpdate(dairyBw, dairyMilk, v, dairyStandard, dairyDry);
                        }
                      }}
                      className="h-7 min-h-7 w-14 px-1.5 py-0 text-[11px] md:min-h-7"
                    />
                    <span>%</span>
                  </label>
                </>
              )}

              <div
                role="group"
                aria-label={pickLang(language, "Standar referensi sapi perah", "Dairy standard")}
                className="neu-pressed inline-flex h-7 items-center rounded-lg p-0.5"
              >
                {(
                  [
                    { id: "kearl_1982", label: "Kearl 82" },
                    { id: "nrc_1988", label: "NRC 88" },
                  ] as const
                ).map((std) => (
                  <button
                    key={std.id}
                    type="button"
                    aria-pressed={dairyStandard === std.id}
                    onClick={() => applyDairyUpdate(dairyBw, dairyMilk, dairyFat, std.id, dairyDry)}
                    className={cn(
                      "cursor-pointer rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors",
                      dairyStandard === std.id
                        ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {std.label}
                  </button>
                ))}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={dairyDry}
                  onChange={(e) =>
                    applyDairyUpdate(dairyBw, dairyMilk, dairyFat, dairyStandard, e.target.checked)
                  }
                  className="h-3.5 w-3.5 cursor-pointer rounded accent-[var(--color-primary)]"
                />
                <span>{pickLang(language, "Kering", "Dry")}</span>
              </label>

              <Badge
                tone={dairyPreview.isExtrapolated ? "amber" : "emerald"}
                title={dairyPreview.sourceLabel}
              >
                {!dairyDry && `FCM ${formatNumberLocale(dairyPreview.fcm4PctKg ?? 0, 1)} kg · `}
                DMI {formatNumberLocale(dairyPreview.dmiKg, 1)} kg ·{" "}
                {dairyPreview.isExtrapolated
                  ? pickLang(language, "Ekstrapolasi", "Extrapolated")
                  : pickLang(language, "Interpolasi", "Interpolated")}
              </Badge>
            </div>
          )}

          {/* 5. Lainnya -> ThemedSelect searchable + section dividers tanpa radio pada header grup */}
          {commodity === "other" && (
            <div className="min-w-0 w-full sm:w-72">
              <ThemedSelect
                id="preset-select"
                ariaLabel={pickLang(language, "Standar Ternak Lainnya", "Other Livestock Presets")}
                modalTitle={pickLang(language, "Pilih Standar Ternak", "Select Livestock Standard")}
                searchPlaceholder={pickLang(
                  language,
                  "Cari Standar (SNI, Kearl, Kambing, Itik)…",
                  "Search Standard (SNI, Kearl, Goat, Duck)…",
                )}
                searchable
                value={activeRequirement.id}
                options={otherPresetOptions}
                language={language}
                popoverMinWidthPx={340}
                onChange={onSelectPreset}
                className="h-8 min-h-8 py-0 text-[11px] md:h-7 md:min-h-7"
              />
            </div>
          )}
        </div>

        {/* Baris Basis, Mode & Toleransi (rapat & rapi pada mobile maupun desktop) */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={pickLang(
              language,
              "Pilih basis As-Fed atau Bahan Kering",
              "Select As-Fed or Dry Matter basis",
            )}
            className="neu-pressed inline-flex h-7 shrink-0 items-center rounded-lg p-0.5"
          >
            {(["as_fed", "dry_matter"] as const).map((basis) => {
              const active = config.activeBasis === basis;
              return (
                <button
                  key={basis}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSetBasis(basis)}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                    active
                      ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {basis === "as_fed" ? "As-Fed" : pickLang(language, "BK (DM)", "DM")}
                </button>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-none">
            <span className="shrink-0 text-[11px] font-semibold whitespace-nowrap text-[var(--text-secondary)]">
              Mode
            </span>
            <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
              <OptimizationModeSelector
                value={config.optimizationMode}
                onChange={onSetMode}
                language={language}
              />
            </div>
          </div>

          {/* Toggle Toleransi khusus mobile (< sm) agar tetap mudah dijangkau tanpa makan baris ekstra */}
          <label
            title={pickLang(
              language,
              "Izinkan sedikit toleransi batas jika target nutrisi terlalu ketat agar tetap keluar racikan terdekat.",
              "Allow slight bound tolerance when targets are too tight.",
            )}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] sm:hidden"
          >
            <Switch
              checked={config.enableElasticFallback}
              onCheckedChange={onToggleElastic}
              label={pickLang(
                language,
                "Aktifkan toleransi batas mobile",
                "Enable flexible bounds mobile",
              )}
            />
            <span>{pickLang(language, "Toleransi", "Flexible")}</span>
          </label>
        </div>
      </div>
    </section>
  );
});
