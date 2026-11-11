"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteLayananAction } from "@/actions/layanan";
import type { Layanan } from "@/types/layanan";
const money = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
export default function KatalogLayananView({
  items,
  q,
  poli,
  discount,
}: {
  items: Layanan[];
  q: string;
  poli: string;
  discount: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Layanan | null>(null);
  const [error, setError] = useState("");
  const submit = () =>
    start(() =>
      router.push(
        `/katalog-layanan?q=${encodeURIComponent(query)}&poli=${encodeURIComponent(poli)}${discount ? "&discount=1" : ""}`,
      ),
    );
  const remove = async () => {
    if (!selected) return;
    const r = await deleteLayananAction(selected.id);
    if (!r.success) setError(r.error);
    else {
      setSelected(null);
      router.refresh();
    }
  };
  return (
    <>
      <div className="mb-5 flex flex-col items-start gap-3 md:flex-row md:items-center">
        <label className="flex h-14.5 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-sm md:h-11.5 md:max-w-120">
          <Search size={16} className="text-ink-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Cari nama atau kode layanan"
            className="w-full bg-transparent text-xs outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {["Semua", "Poli Umum", "Poli Gigi"].map((v) => (
            <button
              key={v}
              onClick={() =>
                router.push(`/katalog-layanan?poli=${encodeURIComponent(v)}`)
              }
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                poli === v && !(v === "Semua" && discount)
                  ? "border-emerald-400 bg-accent-soft text-accent-ink"
                  : "border-line"
              }`}
            >
              {v}
            </button>
          ))}
          <button
            onClick={() =>
              router.push(`/katalog-layanan?discount=${discount ? "0" : "1"}`)
            }
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${discount ? "border-emerald-400 bg-accent-soft text-accent-ink" : "border-line"}`}
          >
            Ada diskon
          </button>
        </div>
        <Link
          href="/katalog-layanan/tambah"
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-white md:ml-auto"
        >
          <Plus size={15} />
          Tambah Layanan
        </Link>
      </div>

      <section
        aria-busy={pending}
        className={`overflow-hidden rounded-xl bg-surface shadow-sm transition-opacity ${
          pending ? "opacity-60" : ""
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 border-collapse text-xs text-left">
            <thead className="bg-surface-muted text-[9px] font-bold uppercase text-ink-2">
              <tr className="h-9">
                <th className="pl-4">Layanan</th>
                <th>Poli</th>
                <th>Kategori</th>
                <th>Tarif</th>
                <th>Diskon</th>
                <th>Status</th>
                <th className="pr-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="h-14 border-t border-line">
                  <td className="pl-4">
                    <b>{i.name}</b>
                    <small className="block text-[10px] text-ink-3">
                      {i.code}
                    </small>
                  </td>
                  <td>{i.poli}</td>
                  <td>{i.category}</td>
                  <td>{money(i.price)}</td>
                  <td>
                    {i.discount.enabled ? (
                      <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px] text-accent-ink">
                        {i.discount.type === "persen"
                          ? `${i.discount.value}%`
                          : money(i.discount.value)}
                      </span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td>
                    <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px] text-accent-ink">
                      {i.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="pr-4">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/katalog-layanan/${i.id}/ubah`}
                        className="grid size-8 place-items-center rounded-lg border border-line"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        onClick={() => setSelected(i)}
                        className="grid size-8 place-items-center rounded-lg border border-danger-line bg-danger-soft text-danger-ink"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={7} className="h-24 text-center text-ink-3">
                    Tidak ada layanan yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4">
          <div
            role="dialog"
            className="w-full max-w-md rounded-xl bg-surface p-5 shadow-high"
          >
            <div className="flex justify-between">
              <h2 className="font-bold">Hapus layanan {selected.name}?</h2>
              <button onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Layanan ini akan dihapus dari katalog.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-line px-4 py-2 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={remove}
                className="rounded-lg bg-red-400 px-4 py-2 text-xs font-semibold text-white"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
