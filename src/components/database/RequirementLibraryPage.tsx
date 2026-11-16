import { useMemo, useState, type ReactNode } from "react";
import { Beef, Bird, Check, Egg, Milk, Plus, Search, Target } from "lucide-react";
import type { AppLanguage, Basis, Requirement } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GlossySquircleIcon, type SquircleTone } from "../ui/GlossySquircleIcon";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { SheetDialog } from "../ui/SheetDialog";

const SPECIES_LABELS: Record<string, string> = {
  broiler: "Ayam Broiler",
  layer: "Ayam Layer",
  duck: "Itik / Bebek",
  cattle_beef: "Sapi Potong",
  cattle_dairy: "Sapi Perah",
  sheep: "Domba",
  goat: "Kambing",
  goat_sheep: "Kambing / Domba",
};

function getSpeciesLabel(species: string): string {
  return SPECIES_LABELS[species] ?? species;
}

function getSpeciesVisual(species: string): { tone: SquircleTone; icon: ReactNode } {
  const s = species.toLowerCase();
  if (s.includes("layer")) return { tone: "amber", icon: <Egg className="h-4 w-4" /> };
  if (s.includes("broiler") || s.includes("duck")) {
    return { tone: "sky", icon: <Bird className="h-4 w-4" /> };
  }
  if (s.includes("dairy")) return { tone: "indigo", icon: <Milk className="h-4 w-4" /> };
  if (s.includes("beef") || s.includes("cattle") || s.includes("goat") || s.includes("sheep")) {
    return { tone: "mint", icon: <Beef className="h-4 w-4" /> };
  }
  return { tone: "petrol", icon: <Target className="h-4 w-4" /> };
}

export interface RequirementLibraryPageProps {
  readonly requirements: readonly Requirement[];
  readonly activeRequirementId: string;
  readonly language: AppLanguage;
  readonly onSelectAndUse: (id: string) => void;
  readonly onCreateProfile: (req: Requirement) => void;
}

export function RequirementLibraryPage({
  requirements,
  activeRequirementId,
  language,
  onSelectAndUse,
  onCreateProfile,
}: RequirementLibraryPageProps) {
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("broiler");
  const [basis, setBasis] = useState<Basis>("as_fed");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredRequirements = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requirements;
    return requirements.filter(
      (req) =>
        req.name.toLowerCase().includes(q) ||
        (req.nameEn?.toLowerCase().includes(q) ?? false) ||
        (req.source?.toLowerCase().includes(q) ?? false) ||
        getSpeciesLabel(req.species).toLowerCase().includes(q),
    );
  }, [requirements, query]);

  const isWindowed = query.trim() === "" && filteredRequirements.length > 50;
  const displayedRequirements =
    isWindowed && !showAll ? filteredRequirements.slice(0, 36) : filteredRequirements;

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

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#54707E] dark:text-slate-400">
            {language === "id" ? "Standar Nutrisi" : "Nutrient Standards"}
          </p>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[#122B36] dark:text-slate-100">
            {language === "id"
              ? "Database Standar Kebutuhan Ternak"
              : "Livestock Requirement Standards"}
          </h1>
          <p className="mt-0.5 text-xs text-[#54707E] dark:text-slate-400">
            Preset standar nutrisi berdasarkan komoditas dan fase pemeliharaan (terpisah dari
            database bahan).
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setOpenCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span>Buat Profil Baru</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#54707E] dark:text-slate-400" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari profil fase, bobot badan, spesies, atau standar (Kearl, NRC, SNI)…"
          aria-label="Cari standar kebutuhan ternak"
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {displayedRequirements.map((req) => {
          const isCurrent = req.id === activeRequirementId;
          const visual = getSpeciesVisual(req.species);
          return (
            <Card key={req.id} highlight={isCurrent ? "emerald" : "none"} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <GlossySquircleIcon
                    tone={visual.tone}
                    size="sm"
                    icon={visual.icon}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-sm font-bold tracking-[-0.015em] text-[#122B36] dark:text-slate-100">
                        {language === "id" ? req.name : (req.nameEn ?? req.name)}
                      </h2>
                      <Badge tone={req.basis === "as_fed" ? "sky" : "emerald"}>
                        {req.basis === "as_fed" ? "As-Fed" : "BK (DM)"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-[#54707E] dark:text-slate-400">
                      Spesies: {getSpeciesLabel(req.species)} · Sumber:{" "}
                      {req.source ?? "Standar internal"}
                    </p>
                  </div>
                </div>

                <Button
                  variant={isCurrent ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => onSelectAndUse(req.id)}
                >
                  {isCurrent && (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>{isCurrent ? "Aktif" : "Gunakan"}</span>
                </Button>
              </div>

              <div className="neu-well mt-3.5 flex flex-wrap gap-1.5 rounded-2xl p-2.5">
                {req.constraints
                  .filter((c) => c.enabled !== false)
                  .slice(0, 6)
                  .map((c) => (
                    <Badge key={c.nutrientId} tone="neutral">
                      {c.nutrientId.toUpperCase()}: {c.min ?? "—"}..{c.max ?? "—"}
                    </Badge>
                  ))}
              </div>
            </Card>
          );
        })}
      </div>

      {isWindowed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/75 bg-white/55 px-4 py-3 text-xs text-[#54707E] dark:border-cyan-200/10 dark:bg-[#0D2E3B]/60 dark:text-slate-300">
          <span>
            Menampilkan {displayedRequirements.length} dari {filteredRequirements.length} profil
            kebutuhan ternak.
          </span>
          <Button variant="secondary" size="sm" onClick={() => setShowAll((prev) => !prev)}>
            {showAll
              ? "Ringkas Tampilan"
              : `Tampilkan Semua (${filteredRequirements.length} profil)`}
          </Button>
        </div>
      )}

      <SheetDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Buat Profil Kebutuhan Ternak Baru"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenCreate(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Buat & Pakai
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Nama Profil / Fase
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mis. Itik Petelur Fase Layer…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
                Komoditas / Spesies
              </label>
              <Select value={species} onChange={(e) => setSpecies(e.target.value)}>
                <option value="broiler">Ayam Broiler</option>
                <option value="layer">Ayam Layer</option>
                <option value="duck">Itik / Bebek</option>
                <option value="cattle_beef">Sapi Potong</option>
                <option value="cattle_dairy">Sapi Perah</option>
                <option value="goat_sheep">Kambing / Domba</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
                Basis Standar
              </label>
              <Select value={basis} onChange={(e) => setBasis(e.target.value as Basis)}>
                <option value="as_fed">As-Fed</option>
                <option value="dry_matter">Bahan Kering (BK)</option>
              </Select>
            </div>
          </div>
        </div>
      </SheetDialog>
    </div>
  );
}
