"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { saveLayananAction } from "@/actions/layanan";
import type { Layanan } from "@/types/layanan";

const input = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs outline-none focus:border-emerald-500";
const empty: Layanan = { id: 0, code: "", name: "", poliId: 1, poli: "", category: "Pemeriksaan", price: 0, discount: 0 };

export default function LayananForm({ initial, poli }: { initial?: Layanan; poli: { idPoli: number; namaPoli: string }[] }) {
  const [form, setForm] = useState(initial ?? empty);
  const [state, action, pending] = useActionState(saveLayananAction.bind(null, initial?.id ?? null), null);
  const set = (key: string, value: string | number) => setForm((old) => ({ ...old, [key]: value }));

  return <form action={action} className="max-w-3xl space-y-5">
    {state && !state.success && <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger-ink">{state.error}</p>}
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold">Informasi Layanan</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className="mb-1 block text-[10px] font-semibold text-ink-2">Nama layanan *</span><input name="namaLayanan" required value={form.name} onChange={(e) => set("name", e.target.value)} className={input} /></label>
        <label><span className="mb-1 block text-[10px] font-semibold text-ink-2">Jenis poli *</span><select name="idPoli" value={form.poliId} onChange={(e) => set("poliId", Number(e.target.value))} className={input}>{poli.map((item) => <option key={item.idPoli} value={item.idPoli}>{item.namaPoli}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] font-semibold text-ink-2">Kategori *</span><select name="kategori" value={form.category} onChange={(e) => set("category", e.target.value)} className={input}>{["Pemeriksaan", "Konsultasi", "Tindakan", "Laboratorium"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] font-semibold text-ink-2">Tarif *</span><input name="tarif" required type="number" min="0" value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} className={input} /></label>
        <label><span className="mb-1 block text-[10px] font-semibold text-ink-2">Diskon (%)</span><input name="diskon" type="number" min="0" max="100" value={form.discount || ""} onChange={(e) => set("discount", Number(e.target.value))} className={input} /></label>
      </div>
      <p className="mt-3 text-[11px] text-ink-3">Kode layanan dibuat otomatis dari ID layanan. Tarif disimpan sebagai transaksi pada tabel keuangan.</p>
    </section>
    <div className="flex justify-end gap-2"><Link href="/katalog-layanan" className="rounded-lg border border-line px-4 py-2 text-xs font-semibold">Batal</Link><button disabled={pending} className="rounded-lg bg-emerald-500 px-5 py-2 text-xs font-semibold text-white">{pending ? "Menyimpan..." : "Simpan"}</button></div>
  </form>;
}
