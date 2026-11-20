import { memo, useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { getSpeciesLabelI18n, pickLang } from "../../i18n";
import type { AppLanguage, Basis, Requirement } from "../../types";
import { cn } from "../../utils/cn";
import { formatNumberLocale, resolveDisplayDigits } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { SheetDialog } from "../ui/SheetDialog";
import { ThemedSelect } from "../ui/ThemedSelect";

export interface RequirementLibraryPageProps {
  readonly requirements: readonly Requirement[];
  readonly activeRequirementId: string;
  readonly language: AppLanguage;
  readonly decimalPlaces?: 0 | 1 | 2 | undefined;
  readonly onSelectAndUse: (id: string) => void;
  readonly onCreateProfile: (req: Requirement) => void;
}

type GroupFilter = "all" | "sni" | "poultry" | "ruminant";

function formatBoundCell(min: number | undefined, max: number | undefined, digits: number): string {
  if (min !== undefined && max !== undefined) {
    return `${formatNumberLocale(min, digits)}–${formatNumberLocale(max, digits)}`;
  }
  if (min !== undefined) return `≥ ${formatNumberLocale(min, digits)}`;
  if (max !== undefined) return `≤ ${formatNumberLocale(max, digits)}`;
  return "—";
}

function extractShortSource(req: Requirement): string {
  const src = req.source ?? "";
  const sniMatch = /SNI\s+[\d.-]+:\d{4}/i.exec(src);
  if (sniMatch) return sniMatch[0];
  if (/Kearl\s*\(1982\)/i.test(src)) return "Kearl (1982)";
  if (/NRC\s*\(1988\)/i.test(src)) return "NRC (1988)";
  if (/NRC.*1994/i.test(src)) return "NRC (1994)";
  if (/NRC.*2016/i.test(src)) return "NRC (2016)";
  return src.length > 28 ? `${src.slice(0, 26)}…` : src || "Standar";
}

function isPoultrySpecies(species: string): boolean {
  return species === "broiler" || species === "layer" || species === "buras" || species === "duck";
}

/**
 * Halaman Profil Kebutuhan Ternak dengan tabel ringkas, sederhana, dan mudah dipindai.
 */
export const RequirementLibraryPage = memo(function RequirementLibraryPage({
  requirements,
  activeRequirementId,
  language,
  decimalPlaces = 0,
  onSelectAndUse,
  onCreateProfile,
}: RequirementLibraryPageProps) {
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("broiler");
  const [basis, setBasis] = useState<Basis>("as_fed");
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");

  const filteredRequirements = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requirements.filter((req) => {
      if (
        groupFilter === "sni" &&
        !req.id.startsWith("sni-") &&
        !(req.source ?? "").includes("SNI")
      ) {
        return false;
      }
      if (groupFilter === "poultry" && !isPoultrySpecies(req.species)) {
        return false;
      }
      if (groupFilter === "ruminant" && isPoultrySpecies(req.species)) {
        return false;
      }
      if (!q) return true;
      return (
        req.name.toLowerCase().includes(q) ||
        (req.nameEn?.toLowerCase().includes(q) ?? false) ||
        (req.source?.toLowerCase().includes(q) ?? false) ||
        (req.phase?.toLowerCase().includes(q) ?? false) ||
        getSpeciesLabelI18n(language, req.species).toLowerCase().includes(q)
      );
    });
  }, [requirements, query, groupFilter, language]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateProfile({
      id: `custom-req-${Date.now()}`,
      name: name.trim(),
      species,
      basis,
      constraints: [
        { nutrientId: "cp", min: 18, enabled: true },
        { nutrientId: "ca", min: 0.8, max: 1.2, enabled: true },
        { nutrientId: "p", min: 0.45, enabled: true },
      ],
      source: "Profil Kustom Pengguna",
    });
    setName("");
    setOpenCreate(false);
  };

  const filterTabs: ReadonlyArray<{ readonly key: GroupFilter; readonly label: string }> = [
    { key: "all", label: pickLang(language, "Semua Standar", "All Standards") },
    { key: "sni", label: pickLang(language, "Standar SNI", "SNI Standards") },
    { key: "poultry", label: pickLang(language, "Unggas", "Poultry") },
    { key: "ruminant", label: pickLang(language, "Sapi & Ruminansia", "Ruminants") },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
            {pickLang(language, "Profil Kebutuhan Pakan Ternak", "Livestock Requirement Profiles")}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Pilih standar nutrisi SNI, Kearl (1982), atau NRC (1988) untuk langsung dipakai pada formulasi.",
              "Select SNI, Kearl (1982), or NRC (1988) standards to apply directly in formulation.",
            )}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setOpenCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span>{pickLang(language, "Buat Profil Baru", "Create New Profile")}</span>
        </Button>
      </div>

      {/* Bar Pencarian + Filter Kelompok Kompak */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter standar ternak">
          {filterTabs.map((tab) => {
            const active = groupFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setGroupFilter(tab.key)}
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                  active
                    ? "border-transparent bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-60 flex-1 sm:max-w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pickLang(
              language,
              "Cari broiler, layer, sapi, SNI 8173…",
              "Search broiler, layer, cattle, SNI…",
            )}
            aria-label={pickLang(
              language,
              "Cari standar kebutuhan ternak",
              "Search livestock requirement standards",
            )}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Tabel Ringkas Standar Kebutuhan */}
      <Card interactive={false} className="overflow-hidden">
        <div className="custom-scrollbar max-h-[68vh] overflow-auto overscroll-contain">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[var(--bg-sunken)] text-[11px] font-bold text-[var(--text-secondary)]">
              <tr>
                <th className="border-b border-[var(--border-subtle)] px-3 py-2.5">
                  {pickLang(language, "Profil & Fase Ternak", "Livestock Profile & Phase")}
                </th>
                <th className="border-b border-[var(--border-subtle)] px-2.5 py-2.5">
                  {pickLang(language, "Standar / Tahun", "Standard / Year")}
                </th>
                <th className="border-b border-[var(--border-subtle)] px-2 py-2.5 text-center">
                  Basis
                </th>
                <th className="border-b border-[var(--border-subtle)] px-2.5 py-2.5 text-right">
                  {pickLang(language, "PK (%)", "CP (%)")}
                </th>
                <th className="border-b border-[var(--border-subtle)] px-2.5 py-2.5 text-right">
                  {pickLang(language, "EM / TDN", "ME / TDN")}
                </th>
                <th className="border-b border-[var(--border-subtle)] px-2.5 py-2.5 text-right">
                  Ca / P (%)
                </th>
                <th className="w-28 border-b border-[var(--border-subtle)] px-3 py-2.5 text-right">
                  {pickLang(language, "Aksi", "Action")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredRequirements.map((req) => {
                const isCurrent = req.id === activeRequirementId;
                const cp = req.constraints.find((c) => c.nutrientId === "cp");
                const me = req.constraints.find((c) => c.nutrientId === "me_poultry");
                const tdn = req.constraints.find((c) => c.nutrientId === "tdn");
                const ca = req.constraints.find((c) => c.nutrientId === "ca");
                const p = req.constraints.find((c) => c.nutrientId === "p");

                const cpDigits = resolveDisplayDigits("%", "cp", decimalPlaces, cp?.min ?? cp?.max);
                const tdnDigits = resolveDisplayDigits(
                  "%",
                  "tdn",
                  decimalPlaces,
                  tdn?.min ?? tdn?.max,
                );
                const caDigits = resolveDisplayDigits("%", "ca", decimalPlaces, ca?.min ?? ca?.max);
                const pDigits = resolveDisplayDigits("%", "p", decimalPlaces, p?.min ?? p?.max);

                const energyLabel = me
                  ? `${formatBoundCell(me.min, me.max, 0)} kcal`
                  : tdn
                    ? `${formatBoundCell(tdn.min, tdn.max, tdnDigits)}% TDN`
                    : "—";

                return (
                  <tr
                    key={req.id}
                    className={cn(
                      "transition-colors hover:bg-[var(--bg-sunken)]",
                      isCurrent && "bg-[var(--status-success-soft)]",
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {language === "id" ? req.name : (req.nameEn ?? req.name)}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {getSpeciesLabelI18n(language, req.species)}
                        {req.phase ? ` · ${req.phase}` : ""}
                      </div>
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap">
                      <Badge tone={req.id.startsWith("sni-") ? "emerald" : "neutral"}>
                        {extractShortSource(req)}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Badge tone={req.basis === "as_fed" ? "sky" : "emerald"}>
                        {req.basis === "as_fed" ? "As-Fed" : pickLang(language, "BK", "DM")}
                      </Badge>
                    </td>
                    <td className="px-2.5 py-2 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                      {cp ? formatBoundCell(cp.min, cp.max, cpDigits) : "—"}
                    </td>
                    <td className="px-2.5 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                      {energyLabel}
                    </td>
                    <td className="px-2.5 py-2 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                      {ca ? formatBoundCell(ca.min, ca.max, caDigits) : "—"} /{" "}
                      {p ? formatBoundCell(p.min, p.max, pDigits) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant={isCurrent ? "secondary" : "primary"}
                        size="sm"
                        onClick={() => onSelectAndUse(req.id)}
                        className="min-h-7 px-2.5 text-[11px] md:min-h-7"
                      >
                        {isCurrent && <Check className="h-3 w-3 text-[var(--status-success)]" />}
                        <span>
                          {isCurrent
                            ? pickLang(language, "Aktif", "Active")
                            : pickLang(language, "Gunakan", "Use")}
                        </span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <SheetDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title={pickLang(
          language,
          "Buat Profil Kebutuhan Ternak Baru",
          "Create New Livestock Requirement Profile",
        )}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenCreate(false)}>
              {pickLang(language, "Batal", "Cancel")}
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              {pickLang(language, "Buat & Pakai", "Create & Apply")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block font-medium text-[var(--text-primary)]">
              {pickLang(language, "Nama Profil / Fase", "Profile / Phase Name")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={pickLang(
                language,
                "Mis. Itik Petelur Fase Layer…",
                "e.g. Laying Duck Layer Phase…",
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-[var(--text-primary)]">
                {pickLang(language, "Komoditas / Spesies", "Species")}
              </label>
              <ThemedSelect
                ariaLabel={pickLang(language, "Komoditas / Spesies", "Species")}
                modalTitle={pickLang(language, "Pilih Komoditas / Spesies", "Select Species")}
                value={species}
                language={language}
                popoverMinWidthPx={220}
                onChange={setSpecies}
                options={[
                  { value: "broiler", label: getSpeciesLabelI18n(language, "broiler") },
                  { value: "layer", label: getSpeciesLabelI18n(language, "layer") },
                  { value: "buras", label: getSpeciesLabelI18n(language, "buras") },
                  { value: "duck", label: getSpeciesLabelI18n(language, "duck") },
                  { value: "cattle_beef", label: getSpeciesLabelI18n(language, "cattle_beef") },
                  { value: "cattle_dairy", label: getSpeciesLabelI18n(language, "cattle_dairy") },
                  { value: "goat_sheep", label: getSpeciesLabelI18n(language, "goat_sheep") },
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--text-primary)]">
                {pickLang(language, "Basis Standar", "Standard Basis")}
              </label>
              <ThemedSelect
                ariaLabel={pickLang(language, "Basis Standar", "Standard Basis")}
                modalTitle={pickLang(language, "Pilih Basis Standar", "Select Standard Basis")}
                value={basis}
                language={language}
                popoverMinWidthPx={190}
                onChange={(val) => setBasis(val as Basis)}
                options={[
                  { value: "as_fed", label: "As-Fed" },
                  {
                    value: "dry_matter",
                    label: pickLang(language, "Bahan Kering (BK)", "Dry Matter (DM)"),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </SheetDialog>
    </div>
  );
});
