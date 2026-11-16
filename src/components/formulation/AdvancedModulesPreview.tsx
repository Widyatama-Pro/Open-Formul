import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Clock,
  Cpu,
  Factory,
  FlaskConical,
  Gauge,
  GitBranch,
  Layers,
  Leaf,
  PackageCheck,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { GlossySquircleIcon, type SquircleTone } from "../ui/GlossySquircleIcon";

export interface AdvancedModulesPreviewProps {
  readonly language?: AppLanguage;
}

type ModuleStageKey = "all" | "precision" | "mill_eco" | "enterprise";

interface ModuleRoadmapItem {
  readonly id: string;
  readonly stage: Exclude<ModuleStageKey, "all">;
  readonly phaseId: string;
  readonly phaseEn: string;
  readonly titleId: string;
  readonly titleEn: string;
  readonly tone: SquircleTone;
  readonly summaryId: string;
  readonly summaryEn: string;
  readonly highlightCoral?: boolean;
}

const STAGE_TABS: ReadonlyArray<{
  readonly key: ModuleStageKey;
  readonly labelId: string;
  readonly labelEn: string;
}> = [
  { key: "all", labelId: "Semua Fitur (15)", labelEn: "All Features (15)" },
  { key: "precision", labelId: "Presisi & Risiko (5)", labelEn: "Precision & Risk (5)" },
  { key: "mill_eco", labelId: "Pabrik & Lingkungan (5)", labelEn: "Mill & Eco (5)" },
  { key: "enterprise", labelId: "Skala Enterprise (5)", labelEn: "Enterprise Scale (5)" },
];

const ADVANCED_MODULES: readonly ModuleRoadmapItem[] = [
  {
    id: "PR-01",
    stage: "precision",
    phaseId: "Fase 4A",
    phaseEn: "Phase 4A",
    titleId: "Diagnosis Konflik Cerdas (IIS) & Penalti Bertingkat",
    titleEn: "Minimal Conflict Debugger (IIS) & Priority Tiers",
    tone: "coral",
    highlightCoral: true,
    summaryId:
      "Menemukan tepat 2–3 aturan yang paling bertabrakan saat target mustahil dicapai, sambil menjaga aturan keselamatan tetap terkunci aman.",
    summaryEn:
      "Pinpoints the exact 2–3 conflicting constraints when a ration is infeasible while locking critical safety rules from being relaxed.",
  },
  {
    id: "PR-02",
    stage: "precision",
    phaseId: "Fase 4A",
    phaseEn: "Phase 4A",
    titleId: "Peta Harga Beli & Rentang Aman Shadow Price",
    titleEn: "Buy/No-Buy Ladder & Shadow Price Validity Range",
    tone: "sky",
    summaryId:
      "Menunjukkan batas tonase sampai kapan harga bayangan tetap berlaku, serta tangga harga di titik berapa bahan alternatif layak dibeli.",
    summaryEn:
      "Shows valid nutrient tonnage intervals for shadow prices plus step-by-step market entry prices for alternative ingredients.",
  },
  {
    id: "PR-03",
    stage: "precision",
    phaseId: "Fase 4A",
    phaseEn: "Phase 4A",
    titleId: "Optimasi Biaya per Energi/Protein & Kendala dEB Aktif",
    titleEn: "Cost-per-Nutrient Optimization & Active dEB/DCAD",
    tone: "petrol",
    summaryId:
      "Memilih formula termurah per kalori energi atau per gram lisin (bukan sekadar per kg pakan) sekaligus mengunci keseimbangan elektrolit.",
    summaryEn:
      "Optimizes lowest cost per Mcal energy or gram lysine rather than per kg alone, while enforcing dEB/DCAD electrolyte balance in the solver.",
  },
  {
    id: "PR-04",
    stage: "precision",
    phaseId: "Fase 4A",
    phaseEn: "Phase 4A",
    titleId: "Formulasi Stokastik & Margin Keamanan (σ)",
    titleEn: "Stochastic Formulation & Safety Margins (σ)",
    tone: "amber",
    summaryId:
      "Menjaga kecukupan gizi tetap aman 90–99% meski kadar protein dan energi bahan baku naik-turun antar pengiriman, tanpa memboroskan nutrisi.",
    summaryEn:
      "Guarantees 90–99% nutrient confidence despite batch-to-batch ingredient variation without over-formulating costly buffers.",
  },
  {
    id: "PR-05",
    stage: "precision",
    phaseId: "Fase 4A",
    phaseEn: "Phase 4A",
    titleId: "Matriks Multi-Enzim & Simulator Ruminansia Cepat",
    titleEn: "Multi-Enzyme Matrix & Fast CNCPS/NASEM Simulator",
    tone: "mint",
    summaryId:
      "Menghitung pelepasan fosfor, energi, dan asam amino dari kombinasi fitase, xilanase, dan protease tanpa hitung ganda, plus evaluasi fermentasi rumen.",
    summaryEn:
      "Models combined phytase, xylanase, and protease nutrient uplifts capped by substrate pools without double-counting, plus fast rumen evaluation.",
  },
  {
    id: "ML-01",
    stage: "mill_eco",
    phaseId: "Fase 5",
    phaseEn: "Phase 5",
    titleId: "Anti-Nol Pintar & Step Timbangan Pabrik (MILP)",
    titleEn: "Semi-Continuous Anti-Zero & Scale Step Rounding",
    tone: "petrol",
    summaryId:
      "Membuat bahan mikro tetap boleh 0% bila mahal, tetapi jika dipakai otomatis di atas batas minimum akurasi timbangan dan kelipatan kantong.",
    summaryEn:
      "Allows expensive ingredients to stay at 0% or jump directly above minimum scale resolution and discrete bag increments.",
  },
  {
    id: "ML-02",
    stage: "mill_eco",
    phaseId: "Fase 5",
    phaseEn: "Phase 5",
    titleId: "Koreksi Susut Peleting & Indeks Kualitas Pelet (PDI)",
    titleEn: "Moisture Shrink Mass Balance & Pellet Quality (PDI)",
    tone: "sky",
    summaryId:
      "Memperhitungkan penguapan air dan debu di mesin cetak, membatasi minyak di mixer, dan menjaga pelet tetap padat agar tidak mudah hancur.",
    summaryEn:
      "Accounts for conditioning steam, evaporative cooling shrink, pre-pellet fat caps, and binder/starch scores to protect pellet durability.",
  },
  {
    id: "ML-03",
    stage: "mill_eco",
    phaseId: "Fase 5",
    phaseEn: "Phase 5",
    titleId: "Aturan Bentrok Aditif & Batas Mikotoksin Gabungan",
    titleEn: "Additive Contraindication & Cumulative Mycotoxin Guard",
    tone: "coral",
    highlightCoral: true,
    summaryId:
      "Memblokir pencampuran obat/koksidiostat yang berbahaya bila digabung, sekaligus membatasi total racun jamur (aflatoksin, DON, ZEA) lintas bahan.",
    summaryEn:
      "Prevents dangerous additive combinations (e.g., ionophores with tiamulin) and caps combined mycotoxin load across all active ingredients.",
  },
  {
    id: "ML-04",
    stage: "mill_eco",
    phaseId: "Fase 5",
    phaseEn: "Phase 5",
    titleId: "Formulasi Ramah Lingkungan & Jejak Karbon (Eco-Nutrition)",
    titleEn: "Multi-Objective LCA Carbon Footprint & N/P Excretion",
    tone: "mint",
    summaryId:
      "Membandingkan biaya pakan dengan emisi karbon (CO₂e), metana sapi, serta buangan nitrogen dan fosfor agar usaha lebih efisien dan ramah lingkungan.",
    summaryEn:
      "Plots cost-vs-carbon Pareto trade-offs alongside enteric methane and nitrogen/phosphorus excretion balances.",
  },
  {
    id: "ML-05",
    stage: "mill_eco",
    phaseId: "Fase 5",
    phaseEn: "Phase 5",
    titleId: "Maksimasi Profit Karkas & Laba Susu (IOFC / Gompertz)",
    titleEn: "Maximum Profit Karkas & Milk Income (IOFC / Gompertz)",
    tone: "amber",
    summaryId:
      "Menentukan kepadatan energi dan asam amino pakan yang mencetak laba bersih panen atau produksi susu paling tinggi, bukan sekadar pakan termurah.",
    summaryEn:
      "Finds the dietary energy and protein density that maximizes net carcass or milk income over feed cost using biological growth curves.",
  },
  {
    id: "EN-01",
    stage: "enterprise",
    phaseId: "Fase 6",
    phaseEn: "Phase 6",
    titleId: "Paket Engine Riset (@open-formul/core) & Crawler Data",
    titleEn: "Decoupled Core Package (@open-formul/core) & Data Crawler",
    tone: "sky",
    summaryId:
      "Memisahkan mesin hitung matematika agar bisa dipakai langsung untuk riset kampus, skrip otomatis, dan pembaruan katalog bahan pakan terbuka.",
    summaryEn:
      "Packages the pure optimization math engine for headless research scripts, notebooks, and automated open feed library curation.",
  },
  {
    id: "EN-02",
    stage: "enterprise",
    phaseId: "Fase 6",
    phaseEn: "Phase 6",
    titleId: "Optimasi Multi-Formula, Kapasitas Silo & Multi-Lot",
    titleEn: "Multi-Blend, Silo Allocation & Multi-Lot Blending",
    tone: "petrol",
    summaryId:
      "Membagi stok gudang terbatas, kapasitas bin silo, dan lot bahan berbeda kualitas secara adil ke banyak produk pakan sekaligus dalam satu hitungan.",
    summaryEn:
      "Allocates scarce inventory, supplier contracts, physical silos, and multiple quality lots simultaneously across an entire mill portfolio.",
  },
  {
    id: "EN-03",
    stage: "enterprise",
    phaseId: "Fase 6",
    phaseEn: "Phase 6",
    titleId: "Asisten Pembelian Lintas Formula (Procurement Matrix)",
    titleEn: "Cross-Formula Procurement Valuation Matrix",
    tone: "mint",
    summaryId:
      "Menilai harga penawaran bahan baru dari pemasok terhadap seluruh formula pabrik sekaligus untuk memutuskan berapa ton yang paling untung dibeli.",
    summaryEn:
      "Evaluates incoming supplier quotes across all active diets simultaneously to guide exact purchasing volumes and break-even prices.",
  },
  {
    id: "EN-04",
    stage: "enterprise",
    phaseId: "Fase 6",
    phaseEn: "Phase 6",
    titleId: "Koneksi Uji Lab / FT-NIR Otomatis ke Stokastik (EWMA)",
    titleEn: "FT-NIR / QC Lab Sample Basket & EWMA Feedback Loop",
    tone: "amber",
    summaryId:
      "Membaca hasil uji lab cepat (NIR) secara bertahap untuk memperbarui kadar rata-rata dan standar deviasi bahan di pabrik tanpa guncangan formula.",
    summaryEn:
      "Imports wet-lab and FT-NIR assays using moving averages to continuously recalibrate mean values and stochastic standard deviations.",
  },
  {
    id: "EN-05",
    stage: "enterprise",
    phaseId: "Fase 6",
    phaseEn: "Phase 6",
    titleId: "Urutan Batch Bebas Kontaminasi & Label SNI / EU / AAFCO",
    titleEn: "Carry-Over Safe Batch Sequencing & SNI/EU/AAFCO Labels",
    tone: "coral",
    highlightCoral: true,
    summaryId:
      "Mengatur urutan jadwal produksi dan pembilasan mixer agar pakan berobat tidak mencemari pakan sensitif, plus cetak label patuh SNI, AAFCO, & EU.",
    summaryEn:
      "Schedules medicated batch order and mandatory flushing to block dangerous carry-over, with compliant feed tag generation for SNI, EU, & AAFCO.",
  },
];

function renderModuleIcon(id: string) {
  switch (id) {
    case "PR-01":
      return <AlertTriangle className="h-4 w-4" />;
    case "PR-02":
      return <TrendingUp className="h-4 w-4" />;
    case "PR-03":
      return <Gauge className="h-4 w-4" />;
    case "PR-04":
      return <Sliders className="h-4 w-4" />;
    case "PR-05":
      return <FlaskConical className="h-4 w-4" />;
    case "ML-01":
      return <Scale className="h-4 w-4" />;
    case "ML-02":
      return <PackageCheck className="h-4 w-4" />;
    case "ML-03":
      return <ShieldAlert className="h-4 w-4" />;
    case "ML-04":
      return <Leaf className="h-4 w-4" />;
    case "ML-05":
      return <Activity className="h-4 w-4" />;
    case "EN-01":
      return <Cpu className="h-4 w-4" />;
    case "EN-02":
      return <Boxes className="h-4 w-4" />;
    case "EN-03":
      return <ShoppingCart className="h-4 w-4" />;
    case "EN-04":
      return <Factory className="h-4 w-4" />;
    default:
      return <ShieldCheck className="h-4 w-4" />;
  }
}

export function AdvancedModulesPreview({ language = "id" }: AdvancedModulesPreviewProps) {
  const [selectedStage, setSelectedStage] = useState<ModuleStageKey>("all");

  const visibleModules = useMemo(() => {
    if (selectedStage === "all") return ADVANCED_MODULES;
    return ADVANCED_MODULES.filter((m) => m.stage === selectedStage);
  }, [selectedStage]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <Badge tone="amber">
              <Clock className="h-3 w-3" />
              <span>{language === "id" ? "Coming Soon · Segera Hadir" : "Coming Soon"}</span>
            </Badge>
            <span className="text-[11px] font-semibold text-[#5B7684] dark:text-cyan-200/75">
              {language === "id"
                ? "Peta Lengkap Modul Advance (15 Fitur)"
                : "Full Advance Modules Roadmap (15 Features)"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.025em] text-[#122B36] dark:text-white">
            {language === "id"
              ? "Modul Presisi, Pabrik & Enterprise (Advance)"
              : "Precision, Feed Mill & Enterprise Modules"}
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-[#54707E] dark:text-slate-300">
            {language === "id"
              ? "Seluruh teori formulasi presisi dan fitur industri telah kami petakan di bawah ini dengan penjelasan fungsi sederhana. Fokus rilis saat ini memastikan aplikasi utama berjalan stabil dan mudah dipasang di Desktop & Mobile terlebih dahulu—selanjutnya modul ini akan dibedah dan dibuka bertahap."
              : "All precision nutrition theories and industrial features are cataloged below with plain-language summaries. Our current release focuses on stable desktop & mobile deployment first, followed by phased research and implementation of each module."}
          </p>
        </div>

        <Card interactive={false} className="w-full p-3.5 sm:w-auto sm:min-w-[270px]">
          <div className="flex items-start gap-2.5">
            <GlossySquircleIcon tone="petrol" size="sm" icon={<GitBranch className="h-4 w-4" />} />
            <div className="text-xs">
              <p className="font-bold text-[#122B36] dark:text-white">
                {language === "id" ? "Tahap Implementasi" : "Rollout Sequence"}
              </p>
              <p className="mt-0.5 text-[11px] text-[#54707E] dark:text-slate-300">
                {language === "id"
                  ? "1. Deploy Desktop & Mobile → 2. Bedah & Riset Teknis → 3. Rilis Fitur Bertahap"
                  : "1. Desktop & Mobile Deploy → 2. Technical Deep-Dive → 3. Phased Rollout"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter tab kategori */}
      <div
        role="tablist"
        aria-label={language === "id" ? "Filter tahap modul lanjutan" : "Filter advanced modules"}
        className="flex flex-wrap gap-2"
      >
        {STAGE_TABS.map((tab) => {
          const active = selectedStage === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedStage(tab.key)}
              className={cn(
                "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-[transform,box-shadow,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                active
                  ? "neu-cta-btn border border-white/15 text-white"
                  : "neu-pill-btn text-[#123340] dark:text-slate-100",
              )}
            >
              {tab.key === "all" && <Layers className="h-3.5 w-3.5" />}
              <span>{language === "id" ? tab.labelId : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleModules.map((m) => (
          <Card
            key={m.id}
            highlight={m.highlightCoral ? "coral" : "none"}
            className="flex flex-col p-4"
          >
            <div className="flex items-start gap-3">
              <GlossySquircleIcon tone={m.tone} size="md" icon={renderModuleIcon(m.id)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-mono text-[11px] font-bold text-[#5B7684] dark:text-cyan-200/80">
                    {m.id} · {language === "id" ? m.phaseId : m.phaseEn}
                  </span>
                  <Badge tone="amber">Coming Soon</Badge>
                </div>
                <h2 className="mt-1 text-sm leading-snug font-bold text-[#122B36] dark:text-white">
                  {language === "id" ? m.titleId : m.titleEn}
                </h2>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#466270] dark:text-slate-300">
              {language === "id" ? m.summaryId : m.summaryEn}
            </p>
          </Card>
        ))}
      </div>

      <Card
        interactive={false}
        className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs"
      >
        <div className="flex items-center gap-2 text-[#466270] dark:text-slate-300">
          <Sparkles className="h-4 w-4 shrink-0 text-[#0E7490] dark:text-cyan-300" />
          <span>
            {language === "id"
              ? "Dokumentasi rumus matematis, skema data, dan rencana bedah teknis untuk seluruh 15 modul tersedia di arsip `docs/advanced-feature-research-plan.md` dan `prd.md`."
              : "Complete mathematical formulas, data schemas, and engineering dissection plans for all 15 modules are documented in `docs/advanced-feature-research-plan.md` and `prd.md`."}
          </span>
        </div>
        <Badge tone="sky">15 {language === "id" ? "Modul Terpetakan" : "Modules Mapped"}</Badge>
      </Card>
    </div>
  );
}
