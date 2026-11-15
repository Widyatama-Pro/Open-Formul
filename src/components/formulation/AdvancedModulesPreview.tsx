import { Cpu, Factory, FlaskConical, Leaf, Layers, ShieldCheck, Sliders } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { GlossySquircleIcon, type SquircleTone } from "../ui/GlossySquircleIcon";

interface ModuleRoadmapItem {
  readonly id: string;
  readonly title: string;
  readonly phase: string;
  readonly tone: SquircleTone;
  readonly summary: string;
  readonly highlightCoral?: boolean;
}

const ADVANCED_MODULES: readonly ModuleRoadmapItem[] = [
  {
    id: "PRO-01",
    title: "Formulasi Stokastik (Margin of Safety σ)",
    phase: "Fase 4A",
    tone: "orchid",
    summary:
      "Input standar deviasi (σ) bahan dan slider Confidence Level 50–99,99% via Recursive LP untuk mencegah defisiensi akibat fluktuasi kualitas bahan.",
  },
  {
    id: "PRO-02",
    title: "Matriks Enzim Non-Linear & Plafon Phytate-P",
    phase: "Fase 4A",
    tone: "mint",
    summary:
      "Pemodelan kurva dosis-respons fitase/xilanase piecewise linear dengan batas degradabilitas substrat Phytate-P (70–80%).",
  },
  {
    id: "PRO-03",
    title: "Parametric Stepping (1D–3D Decision Surface)",
    phase: "Fase 4A",
    tone: "sky",
    summary:
      "Simulasi pergeseran bertahap harga bahan, batas nutrisi, dan komposisi untuk memetakan elastisitas permintaan bahan baku.",
  },
  {
    id: "PRO-04",
    title: "Model Biologis Ruminansia (CNCPS/NASEM) & Emisi eCH4",
    phase: "Fase 4A",
    tone: "amber",
    summary:
      "Fraksi protein A–C, laju pasase kp vs kd, prediksi DMI, uNDF240/peNDF/RUFAL, serta estimasi metana enterik (IPCC Tier 2) & Ortho-P.",
  },
  {
    id: "ENT-02",
    title: "Multi-Blend, Multi-Plant & Silo Allocation (MILP)",
    phase: "Fase 4B",
    tone: "indigo",
    summary:
      "Optimasi simultan lintas formula dengan batasan stok gudang, kontrak pemasok, jumlah bin silo, dan kelipatan step timbangan.",
  },
  {
    id: "ENT-03",
    title: "QC Lab/FT-NIR, Moisture Shrink & Mill Cost",
    phase: "Fase 4B",
    tone: "coral",
    highlightCoral: true,
    summary:
      "Pemisahan Base vs Overlay Ingredients, Sample Basket, koreksi penguapan peleting/ekstrusi, dan kompensasi free-fall timbangan pabrik.",
  },
  {
    id: "ENT-04",
    title: "Pelabelan Regulasi, Premix Explosion & VFD Sequencing",
    phase: "Fase 4B",
    tone: "petrol",
    summary:
      "Pengurutan bahan menurun (EU 767/2009 / AAFCO), withdrawal cascade, hard-block kontaminasi silang pakan berobat, dan log flushing.",
  },
];

function renderModuleIcon(id: string) {
  switch (id) {
    case "PRO-01":
      return <Sliders className="h-4 w-4" />;
    case "PRO-02":
      return <FlaskConical className="h-4 w-4" />;
    case "PRO-03":
      return <Cpu className="h-4 w-4" />;
    case "PRO-04":
      return <Leaf className="h-4 w-4" />;
    case "ENT-02":
      return <Layers className="h-4 w-4" />;
    case "ENT-03":
      return <Factory className="h-4 w-4" />;
    default:
      return <ShieldCheck className="h-4 w-4" />;
  }
}

export function AdvancedModulesPreview() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 lg:p-6">
      <div>
        <p className="text-[11px] font-semibold text-[#5B7684] dark:text-cyan-200/75">
          Roadmap Ekspansi
        </p>
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-[#122B36] dark:text-white">
          Modul Presisi &amp; Skala Industri (Roadmap Fase 4)
        </h1>
        <p className="mt-1 text-xs text-[#54707E] dark:text-slate-300">
          Katalog fitur lanjutan dari dokumen arsitektur yang dijadwalkan setelah mesin inti Fase 2
          dan PWA Offline Fase 3 stabil.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ADVANCED_MODULES.map((m) => (
          <Card key={m.id} highlight={m.highlightCoral ? "coral" : "none"} className="p-4">
            <div className="flex items-start gap-3">
              <GlossySquircleIcon tone={m.tone} size="md" icon={renderModuleIcon(m.id)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-[#647E8B] dark:text-slate-400">
                      {m.id}
                    </p>
                    <h2 className="text-sm font-bold text-[#122B36] dark:text-white">{m.title}</h2>
                  </div>
                  <Badge tone={m.highlightCoral ? "rose" : "sky"}>{m.phase}</Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#466270] dark:text-slate-300">
                  {m.summary}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
