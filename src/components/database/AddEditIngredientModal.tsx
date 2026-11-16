import { useState } from "react";
import type { Basis, Ingredient, IngredientCategory } from "../../types";
import { parseLocaleDecimal } from "../../utils/locale-number";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { SheetDialog } from "../ui/SheetDialog";

export interface AddEditIngredientModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSave: (ingredient: Ingredient) => void;
}

export function AddEditIngredientModal({ open, onClose, onSave }: AddEditIngredientModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<IngredientCategory>("energy");
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
      setError("Nama bahan wajib diisi.");
      return;
    }
    if (parsedPrice === null || parsedPrice < 0) {
      setError("Harga/kg harus angka >= 0.");
      return;
    }
    if (parsedDm === null || parsedDm <= 0 || parsedDm > 100) {
      setError("Bahan kering (BK%) harus antara > 0 dan 100.");
      return;
    }
    if (!source.trim()) {
      setError("Sumber/sitasi data bahan wajib dicantumkan.");
      return;
    }

    const newIng: Ingredient = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      category,
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
      title="Tambah Bahan Pakan Baru"
      subtitle="Data tersimpan ke Database Bahan (kosongkan kolom nutrien bila data belum diuji/N/A)."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Simpan Bahan
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        {error && (
          <p className="glass-card glass-card-coral rounded-2xl bg-rose-50/85 px-3.5 py-2.5 font-medium text-rose-800 dark:bg-rose-950/45 dark:text-rose-200">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Nama Bahan Pakan
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mis. Tepung Maggot BSF…"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Kategori
            </label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as IngredientCategory)}
            >
              <option value="energy">Energi (Energy)</option>
              <option value="protein">Protein (Protein)</option>
              <option value="forage">Hijauan (Forage)</option>
              <option value="mineral">Mineral</option>
              <option value="premix">Premix</option>
              <option value="additive">Aditif / Asam Amino</option>
              <option value="enzyme">Enzim</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Basis Nilai Nutrien
            </label>
            <Select value={basis} onChange={(e) => setBasis(e.target.value as Basis)}>
              <option value="as_fed">As-Fed (Segar apa adanya)</option>
              <option value="dry_matter">Bahan Kering (100% DM)</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Harga Acuan (Rp/kg As-Fed)
            </label>
            <Input numeric value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Bahan Kering / BK (%)
            </label>
            <Input numeric value={dryMatter} onChange={(e) => setDryMatter(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Protein Kasar / PK (%)
            </label>
            <Input numeric value={cp} onChange={(e) => setCp(e.target.value)} placeholder="N/A" />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Energi Metabolis (kcal/kg)
            </label>
            <Input numeric value={me} onChange={(e) => setMe(e.target.value)} placeholder="N/A" />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Kalsium / Ca (%)
            </label>
            <Input numeric value={ca} onChange={(e) => setCa(e.target.value)} placeholder="N/A" />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Fosfor Total / P (%)
            </label>
            <Input numeric value={p} onChange={(e) => setP(e.target.value)} placeholder="N/A" />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block font-medium text-[#122B36] dark:text-slate-200">
              Sumber / Sitasi Data (Wajib)
            </label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
        </div>
      </div>
    </SheetDialog>
  );
}
