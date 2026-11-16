import { useState } from "react";
import { AddEditIngredientModal } from "./components/database/AddEditIngredientModal";
import { IngredientLibraryPage } from "./components/database/IngredientLibraryPage";
import { RequirementLibraryPage } from "./components/database/RequirementLibraryPage";
import { AdvancedModulesPreview } from "./components/formulation/AdvancedModulesPreview";
import { FormulationWorkbench } from "./components/formulation/FormulationWorkbench";
import { AppShell } from "./components/layout/AppShell";
import { ExportDialog } from "./components/recipes/ExportDialog";
import { SaveRecipeDialog } from "./components/recipes/SaveRecipeDialog";
import { SavedRecipesPage } from "./components/recipes/SavedRecipesPage";
import { SettingsPage } from "./components/settings/SettingsPage";
import { usePrototypeStore } from "./hooks/use-prototype-store";
import { usePwaStatus } from "./hooks/use-pwa-status";
import { FEED_JSON_MIME } from "./storage";
import { downloadTextFile } from "./utils/download";

export function App() {
  const store = usePrototypeStore();
  const pwa = usePwaStatus();
  const [saveOpen, setSaveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);

  const handleExportAllBackup = () => {
    const json = store.exportAllBackupJson();
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(json, `open-formul-backup-${dateStamp}.json`, FEED_JSON_MIME);
  };

  return (
    <AppShell
      route={store.route}
      onNavigate={store.setRoute}
      language={store.preferences.language}
      theme={store.preferences.theme}
      onToggleTheme={() => store.setTheme(store.preferences.theme === "light" ? "dark" : "light")}
      onToggleLanguage={() => store.setLanguage(store.preferences.language === "id" ? "en" : "id")}
      isOnline={pwa.isOnline}
      offlineReady={pwa.offlineReady}
      needRefresh={pwa.needRefresh}
      canInstall={pwa.canInstall}
      isInstalled={pwa.isInstalled}
      onApplyUpdate={pwa.applyUpdate}
      onInstallApp={() => {
        void pwa.installApp();
      }}
    >
      {store.route === "formulation" && (
        <FormulationWorkbench
          store={store}
          onOpenSaveDialog={() => setSaveOpen(true)}
          onOpenExportDialog={() => setExportOpen(true)}
          onOpenAddIngredient={() => setAddIngredientOpen(true)}
        />
      )}

      {store.route === "ingredients" && (
        <IngredientLibraryPage
          ingredients={store.ingredients}
          customNutrients={store.config.customNutrients ?? []}
          language={store.preferences.language}
          onToggleActive={(id, active) => store.updateIngredient(id, { isActive: active })}
          onOpenAdd={() => setAddIngredientOpen(true)}
          onImportIngredients={store.importIngredients}
        />
      )}

      {store.route === "requirements" && (
        <RequirementLibraryPage
          requirements={store.requirements}
          activeRequirementId={store.activeRequirement.id}
          language={store.preferences.language}
          onSelectAndUse={(id) => {
            store.selectPreset(id);
            store.setRoute("formulation");
          }}
          onCreateProfile={(req) => {
            store.addRequirement(req);
            store.setRoute("formulation");
          }}
        />
      )}

      {store.route === "recipes" && (
        <SavedRecipesPage
          recipes={store.recipes}
          language={store.preferences.language}
          onLoadRecipe={store.loadRecipe}
          onOpenSaveCurrent={() => setSaveOpen(true)}
          onOpenExport={() => setExportOpen(true)}
          onImportFeedJson={store.importFeedJson}
          onDeleteRecipe={store.deleteRecipe}
        />
      )}

      {store.route === "advanced" && (
        <AdvancedModulesPreview language={store.preferences.language} />
      )}

      {store.route === "settings" && (
        <SettingsPage
          preferences={store.preferences}
          onUpdate={store.updatePreferences}
          storageStats={store.storageStats}
          storageWarnings={store.storageWarnings}
          pwaStatus={pwa}
          onExportAllBackup={handleExportAllBackup}
          onResetSampleData={store.resetAllSampleData}
          onClearAllUserData={store.clearAllUserData}
        />
      )}

      <SaveRecipeDialog
        open={saveOpen}
        defaultName={store.activeRequirement.name}
        onClose={() => setSaveOpen(false)}
        onSave={store.saveCurrentRecipe}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        ingredients={store.ingredients}
        requirement={store.activeRequirement}
        config={store.config}
        result={store.result}
        nutrientsCatalog={store.allNutrients}
      />

      <AddEditIngredientModal
        open={addIngredientOpen}
        onClose={() => setAddIngredientOpen(false)}
        onSave={store.addIngredient}
      />
    </AppShell>
  );
}

export default App;
