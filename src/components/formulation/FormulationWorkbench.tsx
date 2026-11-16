import { useCallback, useMemo, useState } from "react";
import { Plus, Search, Table } from "lucide-react";
import { motion } from "motion/react";
import type { PrototypeStore } from "../../hooks/use-prototype-store";
import type { Ingredient } from "../../types";
import { cn } from "../../utils/cn";
import { ResultsPanel } from "../analytics/ResultsPanel";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { IngredientDesktopTable } from "./IngredientDesktopTable";
import { IngredientDetailSheet } from "./IngredientDetailSheet";
import { IngredientMobileCards } from "./IngredientMobileCards";
import { MobileStickyActionBar } from "./MobileStickyActionBar";
import { NutrientTargetsPanel } from "./NutrientTargetsPanel";
import { WorkbenchToolbar } from "./WorkbenchToolbar";

export interface FormulationWorkbenchProps {
  readonly store: PrototypeStore;
  readonly onOpenSaveDialog: () => void;
  readonly onOpenExportDialog: () => void;
  readonly onOpenAddIngredient: () => void;
}

type MobileStep = "ingredients" | "targets" | "results";

const WORKBENCH_STAGGER = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.06,
      staggerChildren: 0.03,
    },
  },
} as const;

const WORKBENCH_PANEL_ITEM = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

export function FormulationWorkbench({
  store,
  onOpenSaveDialog,
  onOpenExportDialog,
  onOpenAddIngredient,
}: FormulationWorkbenchProps) {
  const [mobileStep, setMobileStep] = useState<MobileStep>("ingredients");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileTableMode, setMobileTableMode] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [windowLimit, setWindowLimit] = useState(36);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const handleOpenDetail = useCallback((ing: Ingredient) => {
    setEditingIngredientId(ing.id);
  }, []);

  const handleToggleInspector = useCallback(() => {
    setInspectorOpen((prev) => !prev);
  }, []);

  const handleCollapseInspector = useCallback(() => {
    setInspectorOpen(false);
  }, []);

  const filteredIngredients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return store.ingredients;
    return store.ingredients.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.nameEn?.toLowerCase().includes(q) ?? false) ||
        i.category.toLowerCase().includes(q),
    );
  }, [store.ingredients, searchQuery]);

  const activeCount = store.ingredients.filter((i) => i.isActive !== false).length;

  const isWindowEligible = searchQuery.trim() === "" && filteredIngredients.length > 50;
  const displayedIngredients = useMemo(() => {
    if (!isWindowEligible || windowLimit >= filteredIngredients.length) return filteredIngredients;
    const activeItems = filteredIngredients.filter((i) => i.isActive !== false);
    const inactiveItems = filteredIngredients.filter((i) => i.isActive === false);
    const extraInactiveCount = Math.max(12, windowLimit - activeItems.length);
    return [...activeItems, ...inactiveItems.slice(0, extraInactiveCount)];
  }, [filteredIngredients, isWindowEligible, windowLimit]);

  const editingIngredient: Ingredient | null = useMemo(
    () => store.ingredients.find((i) => i.id === editingIngredientId) ?? null,
    [store.ingredients, editingIngredientId],
  );

  const language = store.preferences.language;

  const ingredientHeaderBar = (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold tracking-tight text-[#0F172A] dark:text-white">
          {language === "id" ? "Daftar Bahan Pakan" : "Feed Ingredients"}
        </h2>
        <Badge tone="emerald">{activeCount} aktif</Badge>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <div className="relative min-w-36 flex-1 sm:w-48 sm:flex-none">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#475569]"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === "id" ? "Cari bahan…" : "Search feed…"}
            aria-label="Cari bahan pakan"
            className="pl-8 text-xs"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileTableMode((v) => !v)}
          className="neu-pill-btn rounded-lg md:hidden"
          title="Ganti tampilan Kartu / Tabel Kompak"
          aria-label="Ganti tampilan Kartu atau Tabel Kompak"
        >
          <Table className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenAddIngredient}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Tambah</span>
        </Button>
      </div>
    </div>
  );

  const targetPanel = (
    <NutrientTargetsPanel
      requirement={store.activeRequirement}
      allNutrients={store.allNutrients}
      activeBasis={store.config.activeBasis}
      enableAdvance={store.config.enableAdvanceNutrients}
      enableDigestible={store.config.enableDigestibleBasis}
      onToggleDigestible={store.toggleDigestibleBasis}
      nutrientResults={store.result.nutrients}
      conflicts={store.result.conflicts ?? []}
      language={language}
      onUpdateConstraint={store.updateConstraint}
      onAddCustomNutrient={store.addCustomNutrient}
      onRemoveCustomNutrient={store.removeCustomNutrient}
      onUpdateCustomNutrientBasis={store.updateCustomNutrientBasis}
      onCollapse={handleCollapseInspector}
    />
  );

  const resultsPanel = (
    <ResultsPanel
      result={store.result}
      ingredients={store.ingredients}
      allNutrients={store.allNutrients}
      config={store.config}
      hideKpiStrip
      onSetBatchSize={store.setBatchSizeKg}
      onToggleElastic={store.toggleElasticFallback}
      onSetManualLock={store.setManualLock}
      onClearManualLocks={store.clearManualLocks}
    />
  );

  const hasMoreCatalog = displayedIngredients.length < filteredIngredients.length;
  const catalogWindowBanner = isWindowEligible && (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-medium text-[#475569] dark:border-[#1E333D] dark:bg-[#0B1519] dark:text-slate-300">
      <span>
        Menampilkan {displayedIngredients.length} dari {filteredIngredients.length} bahan
        {hasMoreCatalog && ` (${activeCount} aktif + pratinjau katalog)`}
      </span>
      <div className="flex items-center gap-2">
        {hasMoreCatalog && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setWindowLimit((prev) => Math.min(filteredIngredients.length, prev + 50))
            }
          >
            Muat +50 ({filteredIngredients.length - displayedIngredients.length} tersisa)
          </Button>
        )}
        {windowLimit > 36 && (
          <Button variant="ghost" size="sm" onClick={() => setWindowLimit(36)}>
            Ringkas Daftar
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <WorkbenchToolbar
        requirements={store.requirements}
        activeRequirement={store.activeRequirement}
        config={store.config}
        result={store.result}
        language={language}
        demoScenario={store.demoScenario}
        inspectorOpen={inspectorOpen}
        onToggleInspector={handleToggleInspector}
        onSelectPreset={store.selectPreset}
        onSetBasis={store.setActiveBasis}
        onSetMode={store.setOptimizationMode}
        onToggleAdvance={store.toggleAdvanceNutrients}
        onToggleZeroInclusion={store.setGlobalZeroInclusion}
        onToggleElastic={store.toggleElasticFallback}
        onSetDemoScenario={store.setDemoScenario}
        onOpenSaveDialog={onOpenSaveDialog}
        onOpenExportDialog={onOpenExportDialog}
        onResetMock={store.resetAllMock}
      />

      {store.isSolving && (
        <div
          role="status"
          aria-live="polite"
          className="border-b border-[#E2E8F0] bg-white px-4 py-1.5 lg:px-5 dark:border-[#1E333D] dark:bg-[#111F26]"
        >
          <div className="flex items-center gap-3 text-[11px] font-semibold text-[#059669] dark:text-emerald-400">
            <span>Menjalankan Simplex HiGHS…</span>
            <div className="skeleton-shimmer h-1.5 flex-1 rounded-full" />
          </div>
        </div>
      )}

      {/* Mobile & Tablet Stepper (< lg) */}
      <div className="border-b border-[#E2E8F0] bg-white px-4 py-2 lg:hidden dark:border-[#1E333D] dark:bg-[#111F26]">
        <SegmentedTabs
          ariaLabel="Tahapan formulasi mobile"
          value={mobileStep}
          onChange={setMobileStep}
          options={[
            { value: "ingredients", label: "1. Bahan", badge: activeCount },
            { value: "targets", label: "2. Target" },
            { value: "results", label: "3. Hasil" },
          ]}
        />
      </div>

      {/* Desktop Workspace: Prioritas fitur utama 70%-75% + Inspector kanan collapsible 310px */}
      <motion.div
        variants={WORKBENCH_STAGGER}
        initial="hidden"
        animate="visible"
        className={cn(
          "hidden min-h-0 flex-1 gap-3 p-3 lg:grid lg:px-4",
          inspectorOpen ? "lg:grid-cols-[minmax(0,2.7fr)_310px]" : "lg:grid-cols-[minmax(0,1fr)]",
        )}
      >
        {/* Area Kerja Utama: Tabel Formulasi Bahan Pakan + Hasil Optimasi Solver */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <motion.div variants={WORKBENCH_PANEL_ITEM} className="min-h-0 flex-[1.65]">
            <Card
              interactive={false}
              aria-label="Panel Bahan Pakan"
              className="flex h-full min-h-0 flex-col p-3"
            >
              {ingredientHeaderBar}
              <div className="min-h-0 flex-1">
                {filteredIngredients.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-xs text-[#475569]">
                    <p>Tidak ada bahan yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.</p>
                    <Button variant="secondary" size="sm" onClick={() => setSearchQuery("")}>
                      Tampilkan Semua
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="min-h-0 flex-1">
                      <IngredientDesktopTable
                        ingredients={displayedIngredients}
                        allIngredients={store.ingredients}
                        allNutrients={store.allNutrients}
                        composition={store.result.composition}
                        showAdvanceColumns={store.config.enableAdvanceNutrients}
                        globalAntiNol={store.config.globalZeroInclusion.enforceNonZero}
                        language={language}
                        onUpdateIngredient={store.updateIngredient}
                        onResetPriceOverride={store.resetPriceOverride}
                        onOpenDetail={handleOpenDetail}
                        onBatchIngredientsUpdate={store.importIngredients}
                      />
                    </div>
                    {catalogWindowBanner}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.section
            variants={WORKBENCH_PANEL_ITEM}
            aria-label="Panel Hasil Formulasi"
            className="min-h-[210px] flex-1"
          >
            {resultsPanel}
          </motion.section>
        </div>

        {/* Panel Sekunder Kanan Collapsible (lebar tepat 310px) */}
        {inspectorOpen && (
          <motion.section
            variants={WORKBENCH_PANEL_ITEM}
            aria-label="Panel Target Nutrien"
            className="min-h-0 w-[310px]"
          >
            {targetPanel}
          </motion.section>
        )}
      </motion.div>

      {/* Mobile & Tablet Stepper Content (< 1024px) */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-3.5 pb-28 md:p-4 md:pb-8 lg:hidden">
        {mobileStep === "ingredients" && (
          <div className="space-y-3">
            {ingredientHeaderBar}
            {filteredIngredients.length === 0 ? (
              <Card interactive={false} className="p-8 text-center text-xs text-[#475569]">
                Tidak ada bahan yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
              </Card>
            ) : mobileTableMode ? (
              <div className="space-y-2">
                <div className="h-[60dvh]">
                  <IngredientDesktopTable
                    ingredients={displayedIngredients}
                    allIngredients={store.ingredients}
                    allNutrients={store.allNutrients}
                    composition={store.result.composition}
                    showAdvanceColumns={store.config.enableAdvanceNutrients}
                    globalAntiNol={store.config.globalZeroInclusion.enforceNonZero}
                    language={language}
                    onUpdateIngredient={store.updateIngredient}
                    onResetPriceOverride={store.resetPriceOverride}
                    onOpenDetail={handleOpenDetail}
                    onBatchIngredientsUpdate={store.importIngredients}
                  />
                </div>
                {catalogWindowBanner}
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <IngredientDesktopTable
                    ingredients={displayedIngredients}
                    allIngredients={store.ingredients}
                    allNutrients={store.allNutrients}
                    composition={store.result.composition}
                    showAdvanceColumns={store.config.enableAdvanceNutrients}
                    globalAntiNol={store.config.globalZeroInclusion.enforceNonZero}
                    language={language}
                    onUpdateIngredient={store.updateIngredient}
                    onResetPriceOverride={store.resetPriceOverride}
                    onOpenDetail={handleOpenDetail}
                    onBatchIngredientsUpdate={store.importIngredients}
                  />
                </div>
                <div className="md:hidden">
                  <IngredientMobileCards
                    ingredients={displayedIngredients}
                    language={language}
                    onUpdateIngredient={store.updateIngredient}
                    onResetPriceOverride={store.resetPriceOverride}
                    onOpenDetail={handleOpenDetail}
                  />
                </div>
                {catalogWindowBanner}
              </>
            )}
          </div>
        )}

        {mobileStep === "targets" && targetPanel}
        {mobileStep === "results" && resultsPanel}
      </div>

      <MobileStickyActionBar
        status={store.result.status}
        costPerKg={store.result.costPerKg}
        activeStep={mobileStep}
        onShowResults={() => setMobileStep("results")}
      />

      <IngredientDetailSheet
        ingredient={editingIngredient}
        allNutrients={store.allNutrients}
        open={editingIngredient !== null}
        onClose={() => setEditingIngredientId(null)}
        onUpdate={store.updateIngredient}
        onResetPrice={store.resetPriceOverride}
        language={language}
      />
    </div>
  );
}
