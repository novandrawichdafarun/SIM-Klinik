"use client";

import { konfirmasi } from "@/components/feedback/konfirmasi";
import { toast } from "@/components/feedback/toast";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CalendarDays, ChevronDown, CircleCheck, Clock, Info, WalletCards } from "lucide-react";
import { klaimJasaAction } from "@/actions/jasa-pelayanan";
import type { JasaPelayananData, PerolehanJasa, StatusPerolehan } from "@/types/jasa";
import {
  formatDesimal,
  formatRupiah,
  formatTanggal,
  labelBulan,
  labelBulanTahun,
} from "@/utils/format";

type Filter = "semua" | StatusPerolehan;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "belum_diklaim", label: "Belum diklaim" },
  { value: "diklaim", label: "Diklaim" },
];

const STATUS_KLAIM_LABEL: Record<string, string> = {
  diajukan: "Diajukan",
  disetujui: "Disetujui",
  dicairkan: "Dicairkan",
};

function StatusBadge({ item }: { item: PerolehanJasa }) {
  const map: Record<StatusPerolehan, { label: string; cls: string }> = {
    diklaim: { label: "Diklaim", cls: "bg-accent-soft text-accent-ink" },
    belum_diklaim: { label: "Belum diklaim", cls: "bg-warning-soft text-warning-ink" },
  };
  const { label, cls } = map[item.status];
  const title =
    item.status === "diklaim" && item.statusKlaim
      ? `Status klaim: ${STATUS_KLAIM_LABEL[item.statusKlaim] ?? item.statusKlaim}`
      : undefined;
  return (
    <span
      title={title}
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

function rumus(item: PerolehanJasa) {
  const p = Number.isInteger(item.persentase)
    ? `${item.persentase}%`
    : `${formatDesimal(item.persentase, 2)}%`;
  return `${formatRupiah(item.biaya)} × ${p}`;
}

function StatCard({
  icon,
  tone,
  label,
  value,
  note,
  className = "",
}: {
  className?: string;
  icon: React.ReactNode;
  tone: "accent" | "warning";
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-4 shadow-sm md:p-5 ${className}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid size-9 place-items-center rounded-lg ${
            tone === "accent"
              ? "bg-accent-soft text-accent-ink"
              : "bg-warning-soft text-warning-ink"
          }`}
        >
          {icon}
        </span>
        <p className="text-xs text-ink-3">{label}</p>
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight tabular-nums md:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-ink-3">{note}</p>
    </div>
  );
}

export default function JasaPelayananView({
  bulan,
  daftarBulan,
  jabatan,
  items,
  ringkasan,
}: JasaPelayananData) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<Filter>("semua");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(
    () => (filter === "semua" ? items : items.filter((it) => it.status === filter)),
    [items, filter],
  );
  const claimableVisible = visible.filter((it) => it.status === "belum_diklaim");
  const selectedItems = items.filter((it) => selected.has(it.idItem));
  const selectedTotal = selectedItems.reduce((s, it) => s + it.nominal, 0);
  const allVisibleSelected =
    claimableVisible.length > 0 && claimableVisible.every((it) => selected.has(it.idItem));

  const bulanPendek = `${labelBulan(bulan)} ${bulan.slice(0, 4)}`;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const it of claimableVisible) {
        if (allVisibleSelected) next.delete(it.idItem);
        else next.add(it.idItem);
      }
      return next;
    });
  }

  function changeBulan(value: string) {
    setSelected(new Set());
    startTransition(() => router.replace(`${pathname}?bulan=${value}`, { scroll: false }));
  }

  async function handleKlaim() {
    if (selectedItems.length === 0) return;
    const setuju = await konfirmasi({
      judul: "Ajukan klaim pencairan?",
      pesan: `${selectedItems.length} perolehan senilai ${formatRupiah(selectedTotal)}.\nSetelah diajukan, perolehan ini tidak dapat diklaim ulang.`,
      teksYa: "Ya, ajukan klaim",
    });
    if (!setuju) return;
    startTransition(async () => {
      const result = await klaimJasaAction(selectedItems.map((it) => it.idItem));
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSelected(new Set());
      toast.success(result.message ?? "Klaim berhasil diajukan.");
      router.refresh();
    });
  }

  const klaimButton = (label: string, className = "") => (
    <button
      type="button"
      onClick={handleKlaim}
      disabled={selectedItems.length === 0 || isPending}
      className={`flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <WalletCards aria-hidden="true" size={17} />
      {label}
    </button>
  );

  const bulanSelect = (
    <label className="relative flex h-11 items-center gap-2 rounded-lg border border-line bg-surface pr-9 pl-3 text-sm font-medium shadow-sm">
      <CalendarDays aria-hidden="true" size={16} className="text-ink-2" />
      <span className="sr-only">Pilih bulan</span>
      <select
        value={bulan}
        onChange={(e) => changeBulan(e.target.value)}
        className="w-full cursor-pointer appearance-none bg-transparent outline-none"
      >
        {daftarBulan.map((b) => (
          <option key={b} value={b}>
            {labelBulanTahun(b)}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3" />
    </label>
  );

  return (
    <div className={`space-y-5 pb-24 transition-opacity md:pb-0 ${isPending ? "opacity-70" : ""}`}>
      {!jabatan && (
        <p className="flex items-start gap-2 rounded-xl bg-info-soft px-4 py-3 text-sm text-info-ink">
          <Info aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
          Jabatan Anda tidak termasuk penerima jasa pelayanan (hanya dokter dan perawat), sehingga
          tindakan tidak dihitung.
        </p>
      )}

      {/* Mobile: pilih bulan di atas */}
      <div className="md:hidden">{bulanSelect}</div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard
          className="col-span-2 md:col-span-1"
          icon={<WalletCards aria-hidden="true" size={18} />}
          tone="accent"
          label={`Total perolehan · ${bulanPendek}`}
          value={formatRupiah(ringkasan.total)}
          note={`${ringkasan.jumlahDihitung} tindakan sudah dihitung`}
        />
        <StatCard
          icon={<Clock aria-hidden="true" size={18} />}
          tone="warning"
          label="Belum diklaim"
          value={formatRupiah(ringkasan.belumDiklaim)}
          note={`${ringkasan.jumlahBelumDiklaim} perolehan siap diklaim`}
        />
        <StatCard
          icon={<CircleCheck aria-hidden="true" size={18} />}
          tone="accent"
          label="Sudah diklaim"
          value={formatRupiah(ringkasan.sudahDiklaim)}
          note={`${ringkasan.jumlahSudahDiklaim} perolehan · status diajukan / diproses`}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:p-5">
          <div className="hidden w-52 md:block">{bulanSelect}</div>
          <div role="group" aria-label="Filter status" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === f.value
                    ? "border-emerald-500 bg-accent-soft text-accent-ink"
                    : "border-line bg-surface hover:bg-surface-hover"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-4 md:ml-auto md:flex">
            <div className="text-right">
              <p className="text-[11px] text-ink-3">{selectedItems.length} dipilih</p>
              <p className="font-bold tabular-nums">{formatRupiah(selectedTotal)}</p>
            </div>
            {klaimButton(
              selectedItems.length > 0 ? `Klaim (${selectedItems.length} dipilih)` : "Klaim",
            )}
          </div>
        </div>

        {/* Desktop: tabel */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-180 border-collapse text-left text-sm">
            <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
              <tr className="h-10">
                <th className="w-12 pl-5">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua perolehan yang belum diklaim"
                    checked={allVisibleSelected}
                    disabled={claimableVisible.length === 0}
                    onChange={toggleAll}
                    className="size-4.5 cursor-pointer accent-chart disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </th>
                <th className="px-3">Tanggal</th>
                <th className="px-3">Tindakan</th>
                <th className="px-3">Biaya tindakan</th>
                <th className="px-3">Persentase</th>
                <th className="px-3">Jasa pelayanan</th>
                <th className="pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((it) => {
                const checked = selected.has(it.idItem);
                const disabled = it.status !== "belum_diklaim";
                return (
                  <tr
                    key={it.idItem}
                    className={`h-13 border-t border-line ${checked ? "bg-accent-soft/50" : ""}`}
                  >
                    <td className="pl-5">
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${it.namaLayanan} ${formatTanggal(it.tanggal)}`}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(it.idItem)}
                        className="size-4.5 cursor-pointer accent-chart disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 text-ink-2">{formatTanggal(it.tanggal)}</td>
                    <td className="px-3">
                      <span className="font-semibold">{it.namaLayanan}</span>
                      <span className="block text-xs text-ink-3">
                        sebagai {it.peran === "dokter" ? "Dokter" : "Perawat"}
                      </span>
                    </td>
                    <td className="px-3 tabular-nums">{formatRupiah(it.biaya)}</td>
                    <td className="px-3 text-ink-3 tabular-nums">
                      {`${formatDesimal(it.persentase, Number.isInteger(it.persentase) ? 0 : 2)}%`}
                    </td>
                    <td className="px-3 font-bold tabular-nums">{formatRupiah(it.nominal)}</td>
                    <td className="pr-5">
                      <StatusBadge item={it} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: kartu */}
        <ul className="divide-y divide-line border-t border-line md:hidden">
          {visible.map((it) => {
            const checked = selected.has(it.idItem);
            const disabled = it.status !== "belum_diklaim";
            return (
              <li key={it.idItem} className={checked ? "bg-accent-soft/50" : ""}>
                <label
                  className={`flex items-start gap-3 px-4 py-3 ${disabled ? "" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(it.idItem)}
                    className="mt-1 size-5 shrink-0 cursor-pointer accent-chart disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-ink-3">
                      {formatTanggal(it.tanggal)}
                    </span>
                    <span className="block font-semibold">{it.namaLayanan}</span>
                    <span className="block text-xs text-ink-3">{rumus(it)}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-bold tabular-nums">{formatRupiah(it.nominal)}</span>
                    <StatusBadge item={it} />
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {visible.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-ink-3">
            {items.length === 0
              ? `Belum ada tindakan yang Anda tangani pada ${labelBulanTahun(bulan)}.`
              : "Tidak ada perolehan dengan status ini."}
          </p>
        )}

        <footer className="flex flex-col gap-1 border-t border-line px-5 py-3 text-xs text-ink-3 sm:flex-row sm:justify-between">
          <span>
            Menampilkan {visible.length} penanganan · {labelBulanTahun(bulan)}
          </span>
          <span className="font-bold text-ink">
            Total perolehan: {formatRupiah(ringkasan.total)}
          </span>
        </footer>
      </section>

      <p className="flex items-start gap-2 rounded-xl bg-info-soft px-4 py-3 text-sm text-info-ink">
        <Info aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
        Nominal = biaya tindakan × persentase tarif sesuai jabatan Anda pada tanggal tindakan.
      </p>

      {/* Mobile: bilah klaim menempel di bawah */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 shadow-high md:hidden">
        <div>
          <p className="text-[11px] text-ink-3">{selectedItems.length} perolehan dipilih</p>
          <p className="font-bold tabular-nums">{formatRupiah(selectedTotal)}</p>
        </div>
        {klaimButton("Klaim")}
      </div>
    </div>
  );
}
