"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFeedbackAksi } from "@/components/feedback/useFeedbackAksi";
import { saveLayananAction } from "@/actions/layanan";
import type { Layanan } from "@/types/layanan";
const input =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 mb-3 text-xs outline-none focus:border-emerald-500";
const empty: Layanan = {
  id: 0,
  code: "",
  name: "",
  poliId: 1,
  poli: "Poli Umum",
  category: "Pemeriksaan",
  price: 0,
  description: "",
  active: true,
  discount: {
    enabled: false,
    eventName: "",
    value: 0,
    startDate: "",
    endDate: "",
  },
};
export default function LayananForm({
  initial,
  poli,
}: {
  initial?: Layanan;
  poli: { idPoli: number; namaPoli: string }[];
}) {
  const [f, setF] = useState(initial ?? empty);
  const [state, action, pending] = useActionState(
    saveLayananAction.bind(null, initial?.id ?? null),
    null,
  );
  useFeedbackAksi(state);
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const sd = (k: string, v: unknown) =>
    setF((x) => ({ ...x, discount: { ...x.discount, [k]: v } }));
  // Diskon event selalu persen dari tarif
  const discount = Math.round((f.price * f.discount.value) / 100);
  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
      <section className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-bold">Informasi Layanan</h2>
        <p className="mb-4 text-[11px] text-ink-3">
          {initial?.code ? (
            <>
              Kode layanan <b className="text-ink">{initial.code}</b> · dibuat otomatis dan tidak
              dapat diubah.
            </>
          ) : (
            "Kode layanan dibuat otomatis setelah layanan disimpan."
          )}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            [
              "Nama layanan",
              <input
                key="name"
                required
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
                className={input}
              />,
            ],
            [
              "Jenis poli",
              <select
                key="poli"
                value={f.poliId}
                onChange={(e) => set("poliId", Number(e.target.value))}
                className={input}
              >
                {poli.map((p) => (
                  <option key={p.idPoli} value={p.idPoli}>
                    {p.namaPoli}
                  </option>
                ))}
              </select>,
            ],
            [
              "Kategori",
              <select
                key="category"
                value={f.category}
                onChange={(e) => set("category", e.target.value)}
                className={input}
              >
                {["Pemeriksaan", "Konsultasi", "Tindakan", "Laboratorium"].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </select>,
            ],
            [
              "Tarif",
              <input
                key="price"
                required
                type="number"
                min="0"
                value={f.price || ""}
                onChange={(e) => set("price", Number(e.target.value))}
                className={input}
              />,
            ],
          ].map(([label, control]) => (
            <label key={String(label)}>
              <span className="mb-1 block text-[10px] font-semibold text-ink-2">
                {label as string}
              </span>
              {control}
            </label>
          ))}
          <label className="md:col-span-2">
            <span className="mb-1 block text-[10px] font-semibold text-ink-2">
              Deskripsi
            </span>
            <textarea
              name="deskripsi"
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs"
            />
          </label>
        </div>
        <div className="mt-4">
          <span className="mb-1 block text-[10px] font-semibold text-ink-2">
            Status layanan
          </span>
          <div className="flex rounded-lg bg-surface-muted p-1">
            {[
              [true, "Aktif"],
              [false, "Nonaktif"],
            ].map(([v, l]) => (
              <button
                key={String(l)}
                type="button"
                onClick={() => set("active", v)}
                className={`h-8 flex-1 rounded-md text-xs font-semibold ${f.active === v ? "bg-surface shadow-sm" : "text-ink-3"}`}
              >
                {l as string}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="mb-4 flex justify-between">
          <h2 className="text-sm font-bold">Diskon Event</h2>
          <button
            type="button"
            onClick={() => sd("enabled", !f.discount.enabled)}
            className={`h-5 w-10 rounded-full ${f.discount.enabled ? "bg-emerald-500" : "bg-line"}`}
          >
            <span
              className={`block size-4 rounded-full bg-white transition ${f.discount.enabled ? "ml-5" : "ml-0.5"}`}
            />
          </button>
        </div>
        <div className="space-y-4">
          <label>
            <span className="mb-1 block text-[10px] font-semibold text-ink-2">
              Nama event
            </span>
            <input
              disabled={!f.discount.enabled}
              value={f.discount.eventName}
              onChange={(e) => sd("eventName", e.target.value)}
              className={input}
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold text-ink-2">
              Nilai diskon (%)
            </span>
            <div className="relative">
              <input
                disabled={!f.discount.enabled}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={f.discount.value || ""}
                onChange={(e) => sd("value", Number(e.target.value))}
                className={`${input} pr-8`}
              />
              <span className="pointer-events-none absolute top-2.5 right-3 text-xs text-ink-3">
                %
              </span>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-[10px] font-semibold text-ink-2">
                Mulai
              </span>
              <input
                disabled={!f.discount.enabled}
                type="date"
                value={f.discount.startDate}
                onChange={(e) => sd("startDate", e.target.value)}
                className={input}
              />
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-semibold text-ink-2">
                Selesai
              </span>
              <input
                disabled={!f.discount.enabled}
                type="date"
                value={f.discount.endDate}
                onChange={(e) => sd("endDate", e.target.value)}
                className={input}
              />
            </label>
          </div>
          {f.discount.enabled && (
            <div className="rounded-lg bg-background p-3 text-[11px]">
              <div className="flex justify-between">
                <span>Tarif normal</span>
                <b>Rp {f.price.toLocaleString("id-ID")}</b>
              </div>
              <div className="mt-2 flex justify-between">
                <span>Diskon ({f.discount.value || 0}%)</span>
                <b>- Rp {discount.toLocaleString("id-ID")}</b>
              </div>
              <div className="mt-2 flex justify-between border-t border-line pt-2">
                <span>Harga saat event</span>
                <b>
                  Rp {Math.max(0, f.price - discount).toLocaleString("id-ID")}
                </b>
              </div>
            </div>
          )}
        </div>
      </section>
      <input type="hidden" name="namaLayanan" value={f.name} />
      <input type="hidden" name="idPoli" value={f.poliId} />
      <input type="hidden" name="kategori" value={f.category} />
      <input type="hidden" name="tarif" value={f.price} />
      <input type="hidden" name="statusAktif" value={f.active ? "1" : "0"} />
      <input
        type="hidden"
        name="diskonAktif"
        value={f.discount.enabled ? "1" : "0"}
      />
      <input type="hidden" name="namaEvent" value={f.discount.eventName} />
      <input type="hidden" name="nilaiDiskon" value={f.discount.value} />
      <input type="hidden" name="mulaiDiskon" value={f.discount.startDate} />
      <input type="hidden" name="selesaiDiskon" value={f.discount.endDate} />
      <div className="flex justify-end gap-2 lg:col-span-2">
        <Link
          href="/katalog-layanan"
          className="rounded-lg border border-line px-4 py-2 text-xs font-semibold"
        >
          Batal
        </Link>
        <button
          disabled={pending}
          className="rounded-lg bg-emerald-500 px-5 py-2 text-xs font-semibold text-white"
        >
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
