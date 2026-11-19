import { useState } from "react";
import { FEED_CLASSES, feedClassToCategory, getFeedClassLabel } from "../../data/feed-classes";
import { pickLang } from "../../i18n";
import type { AppLanguage, Basis, FeedClassCode, Ingredient } from "../../types";
import { parseLocaleDecimal } from "../../utils/locale-number";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { SheetDialog } from "../ui/SheetDialog";

export interface AddEditIngredientModalProps {
  readonly open: boolean;
  readonly language?: AppLanguage;
  readonly onClose: () => void;
  readonly onSave: (ingredient: Ingredient) => void;
}

export function AddEditIngredientModal({
  open,
  language = "id",
  onClose,
  onSave,
}: AddEditIngredientModalProps) {
  const [name, setName] = useState("");
  const [feedClass, setFeedClass] = useState<FeedClassCode>(4);
  const [basis, setBasis] = useState<Basis>("as_fed");
  const [price, setPrice] = useState("4500");
  const [dryMatter, setDryMatter] = useState("88");
  const [cp, setCp] = useState("10");
  const [me, setMe] = useState("2800");
  const [ca, setCa] = useState("0.1");
  const [p, setP] = useState("0.3");
  const [source, setSource] = useState("Input Lokal Pengguna / Lab");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const parsedPrice = parseLocaleDecimal(price, { treatSingleThousandDot: true });
    const parsedDm = parseLocaleDecimal(dryMatter);
    const parsedCp = cp.trim() === "" ? null : parseLocaleDecimal(cp);
    const parsedMe = me.trim() === "" ? null : parseLocaleDecimal(me);
    const parsedCa = ca.trim() === "" ? null : parseLocaleDecimal(ca);
    const parsedP = p.trim() === "" ? null : parseLocaleDecimal(p);

    if (!trimmedName) {
      setError(pickLang(language, "Nama bahan wajib diisi.", "Ingredient name is required."));
      return;
    }
    if (parsedPrice === null || parsedPrice < 0) {
      setError(pickLang(language, "Harga/kg harus angka >= 0.", "Price/kg must be a number >= 0."));
      return;
    }
    if (parsedDm === null || parsedDm <= 0 || parsedDm > 100) {
      setError(
        pickLang(
          language,
          "Bahan kering (BK%) harus antara > 0 dan 100.",
          "Dry matter (DM%) must be between > 0 and 100.",
        ),
      );
      return;
    }
    if (!source.trim()) {
      setError(
        pickLang(
          language,
          "Sumber/sitasi data bahan wajib dicantumkan.",
          "Data source/citation is required.",
        ),
      );
      return;
    }

    const newIng: Ingredient = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      category: feedClassToCategory(feedClass),
      feedClass,
      pricePerKg: parsedPrice,
      dryMatter: parsedDm,
      basis,
      isActive: true,
      inclusion: { min: 0, max: 100 },
      nutrients: {
        cp: parsedCp,
        me_poultry: parsedMe,
        ca: parsedCa,
        p: parsedP,
        cf: null,
        ee: null,
        lys: null,
        met: null,
      },
      source: source.trim(),
    };

    onSave(newIng);
    setName("");
    setError(null);
    onClose();
  };

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title={pickLang(language, "Tambah Bahan Pakan Baru", "Add New Feed Ingredient")}
      subtitle={pickLang(
        language,
        "Kosongkan kolom nutrien bila belum memiliki hasil uji lab (disimpan sebagai N/A, bukan 0).",
        "Leave nutrient fields blank if lab data is unavailable (saved as N/A, not 0).",
      )}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {pickLang(language, "Batal", "Cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {pickLang(language, "Simpan Bahan", "Save Feed")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        {error && (
          <p
            role="alert"
            className="glass-card glass-card-coral rounded-2xl border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-3 font-medium text-[var(--status-danger)]"
          >
            {error}
          </p>
        )}

        <div>
          <label className="mb-1 block font-medium text-[var(--text-primary)]">
            {pickLang(language, "Nama Bahan", "Ingredient Name")}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={pickLang(language, "Mis. Bungkil Kopra Lokal", "e.g. Local Copra Meal")}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-[var(--text-primary)]">
              {pickLang(
                language,
                "Klasifikasi (8 Kelas Standar)",
                "Feed Class (8 Standard Classes)",
              )}
            </label>
            <Select
              value={String(feedClass)}
              onChange={(e) => setFeedClass(Number(e.target.value) as FeedClassCode)}
            >
              {FEED_CLASSES.map((fc) => (
                <option key={fc.code} value={fc.code}>
                  {getFeedClassLabel(language, fc.code)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-[var(--text-primary)]">
              {pickLang(language, "Basis Data Lab", "Lab Data Basis")}
            </label>
            <Select value={basis} onChange={(e) => setBasis(e.target.value as Basis)}>
              <option value="as_fed">As-Fed</option>
              <option value="dry_matter">
                {pickLang(language, "Bahan Kering (BK)", "Dry Matter (DM)")}
              </option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-medium text-[var(--text-primary)]">
              {pickLang(language, "Harga / kg As-Fed (Rp)", "Price / kg As-Fed (IDR)")}
            </label>
            <Input numeric value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block font-medium text-[var(--text-primary)]">
              {pickLang(language, "Bahan Kering / BK (%)", "Dry Matter / DM (%)")}
            </label>
            <Input numeric value={dryMatter} onChange={(e) => setDryMatter(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block font-medium text-[var(--text-primary)]">
              {pickLang(language, "PK (%)", "CP (%)")}
            </label>
            <Input numeric value={cp} onChange={(e) => setCp(e.target.value)} placeholder="N/A" />
          </div>
          <div>
            <label className="mb-1 block font-medium text-[var(--text-primary)]">
              {pickLang(language, "EM (kcal/kg)", "ME (kcal/kg)")}
            </label>
            <Input numeric value={me} onChange={(e) => setMe(e.target.value)} placeholder="N/A" />
          </div>
          <div>
            <label className="mb-1 block font-medium text-[var(--text-primary)]">Ca (%)</label>
            <Input numeric value={ca} onChange={(e) => setCa(e.target.value)} placeholder="N/A" />
          </div>
          <div>
            <label className="mb-1 block font-medium text-[var(--text-primary)]">P (%)</label>
            <Input numeric value={p} onChange={(e) => setP(e.target.value)} placeholder="N/A" />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-medium text-[var(--text-primary)]">
            {pickLang(language, "Sumber Data / Referensi", "Data Source / Reference")}
          </label>
          <Input value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
      </div>
    </SheetDialog>
  );
}
