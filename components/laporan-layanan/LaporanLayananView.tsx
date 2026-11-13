"use client";

import { Download, Filter, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

import type { LaporanLayanan } from "@/types/laporan-layanan";

const money = (value: number) =>
  `Rp ${Math.round(value).toLocaleString("id-ID")}`;

type SummaryCardProps = {
  label: string;
  value: string;
  hint: string;
};

const chartColors = [
  "#059669",
  "#0d9488",
  "#0284c7",
  "#7c3aed",
  "#d97706",
  "#dc2626",
];

function BarChart({ report }: { report: LaporanLayanan }) {
  const maxRevenue = Math.max(
    ...report.rekap.map((row) => row.pendapatan),
    1,
  );

  if (!report.rekap.length) {
    return (
      <p className="py-12 text-center text-xs text-ink-3">
        Belum ada data pendapatan pada periode ini.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {report.rekap.map((row, index) => (
        <div key={`${row.namaLayanan}-${row.poli}`}>
          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
            <span className="min-w-0 truncate font-medium">
              {row.namaLayanan} · {row.poli}
            </span>
            <span className="shrink-0 font-semibold">
              {money(row.pendapatan)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-surface-muted print:border print:border-gray-300">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.pendapatan / maxRevenue) * 100}%`,
                backgroundColor: chartColors[index % chartColors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ report }: { report: LaporanLayanan }) {
  const segments = report.pendapatanPoli.reduce(
    (result, row, index) => {
      const start = result.current;
      const end = start + row.persentase;

      return {
        current: end,
        values: [
          ...result.values,
          `${chartColors[index % chartColors.length]} ${start}% ${end}%`,
        ],
      };
    },
    { current: 0, values: [] as string[] },
  ).values;
  const background = segments.length
    ? `conic-gradient(${segments.join(", ")})`
    : "#e5e7eb";

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div
        className="relative size-40 shrink-0 rounded-full print:size-32"
        style={{ background }}
        aria-label="Diagram kontribusi pendapatan per poli"
      >
        <div className="absolute inset-7 grid place-items-center rounded-full bg-surface text-center print:inset-6">
          <span className="text-[10px] text-ink-3">Total</span>
          <strong className="text-xs">
            {money(report.ringkasan.totalPendapatan)}
          </strong>
        </div>
      </div>
      <div className="space-y-2 text-xs">
        {report.pendapatanPoli.map((row, index) => (
          <div key={row.poli} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{
                backgroundColor: chartColors[index % chartColors.length],
              }}
            />
            <span>{row.poli}</span>
            <strong className="ml-auto pl-4">
              {row.persentase.toFixed(1)}%
            </strong>
          </div>
        ))}
        {!report.pendapatanPoli.length && (
          <span className="text-ink-3">Belum ada data pendapatan.</span>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4 shadow-sm print:rounded-none print:border-black print:p-3 print:shadow-none">
      <p className="text-[10px] text-ink-3">{label}</p>
      <h2 className="mt-2 text-lg font-bold">{value}</h2>
      <p className="mt-1 text-[10px] text-ink-3">{hint}</p>
    </article>
  );
}

export default function LaporanLayananView({
  report,
}: {
  report: LaporanLayanan;
}) {
  const router = useRouter();

  function applyFilter(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams({
      mulai: String(data.get("mulai")),
      selesai: String(data.get("selesai")),
      poli: String(data.get("poli")),
    });

    router.push(`/laporan-layanan?${params}`);
  }

  function downloadCsv() {
    const rows = [
      [
        "No.",
        "Nama Layanan",
        "Poli",
        "Tarif Layanan",
        "Jumlah Kunjungan",
        "Total Pendapatan",
        "Kontribusi (%)",
        "Peringkat",
      ],
      ...report.rekap.map((row) => [
        String(row.peringkat),
        row.namaLayanan,
        row.poli,
        String(row.tarif),
        String(row.jumlah),
        String(row.pendapatan),
        row.persentase.toFixed(1),
        String(row.peringkat),
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "laporan-layanan.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="report-page space-y-5">
      <header className="print-report-header">
        <p className="text-xs font-semibold uppercase tracking-wider">
          Sistem Informasi Klinik
        </p>
        <h1 className="mt-1 text-2xl font-bold">Laporan Layanan</h1>
        <p className="mt-1 text-sm">
          Periode {report.filter.mulai} sampai {report.filter.selesai}
          {report.filter.poli !== "Semua" && ` · ${report.filter.poli}`}
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilter(event.currentTarget);
        }}
        className="print-hidden flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm md:flex-row md:items-end"
      >
        <label className="flex-1">
          <span className="mb-1 block text-[10px] font-semibold text-ink-2">
            Dari tanggal
          </span>
          <input
            name="mulai"
            type="date"
            defaultValue={report.filter.mulai}
            className="h-10 w-full rounded-lg border border-line px-3 text-xs"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[10px] font-semibold text-ink-2">
            Sampai tanggal
          </span>
          <input
            name="selesai"
            type="date"
            defaultValue={report.filter.selesai}
            className="h-10 w-full rounded-lg border border-line px-3 text-xs"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[10px] font-semibold text-ink-2">
            Jenis poli
          </span>
          <select
            name="poli"
            defaultValue={report.filter.poli}
            className="h-10 w-full rounded-lg border border-line px-3 text-xs"
          >
            <option>Semua</option>
            <option>Poli Umum</option>
            <option>Poli Gigi</option>
          </select>
        </label>
        <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-white">
          <Filter size={14} />
          Terapkan Filter
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-4 text-xs font-semibold"
        >
          <Download size={14} />
          Unduh Excel
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-4 text-xs font-semibold"
        >
          <Printer size={14} />
          Cetak PDF
        </button>
      </form>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:grid-cols-4 print:gap-2">
        <SummaryCard
          label="Total pendapatan"
          value={money(report.ringkasan.totalPendapatan)}
          hint="Periode terpilih"
        />
        <SummaryCard
          label="Jumlah layanan"
          value={`${report.ringkasan.jumlahLayanan} layanan`}
          hint="Seluruh poli"
        />
        <SummaryCard
          label="Pendapatan tertinggi"
          value={report.ringkasan.layananTertinggi}
          hint={`Poli ${report.ringkasan.poliTertinggi}`}
        />
        <SummaryCard
          label="Rata-rata per layanan"
          value={money(report.ringkasan.rataRata)}
          hint="Pendapatan dibagi jumlah layanan"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2 print:grid-cols-2 print:gap-3">
        <article className="rounded-xl border border-line bg-surface p-4 shadow-sm print:rounded-none print:border-black print:p-3 print:shadow-none">
          <h2 className="text-sm font-bold">Perbandingan Pendapatan Layanan</h2>
          <p className="mb-5 text-[10px] text-ink-3">
            Urutan dari kontribusi pendapatan terbesar
          </p>
          <BarChart report={report} />
        </article>
        <article className="rounded-xl border border-line bg-surface p-4 shadow-sm print:rounded-none print:border-black print:p-3 print:shadow-none">
          <h2 className="text-sm font-bold">Distribusi Pendapatan per Poli</h2>
          <p className="mb-5 text-[10px] text-ink-3">
            Persentase terhadap total pendapatan periode terpilih
          </p>
          <DonutChart report={report} />
        </article>
      </section>

      <section className="report-table overflow-hidden rounded-xl border border-line bg-surface shadow-sm print:rounded-none print:border-black print:shadow-none">
        <div className="p-4 print:p-3">
          <h2 className="text-sm font-bold">Rekap Layanan</h2>
          <p className="text-[10px] text-ink-3">
            Periode {report.filter.mulai} sampai {report.filter.selesai}
          </p>
        </div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[760px] text-left text-xs print:min-w-0 print:table-fixed">
            <thead className="bg-surface-muted text-[9px] font-bold uppercase print:bg-gray-100">
              <tr className="h-9">
                <th className="w-[6%] pl-4 print:pl-3">No.</th>
                <th className="w-[23%]">Nama Layanan</th>
                <th className="w-[14%]">Poli</th>
                <th className="w-[16%]">Tarif Layanan</th>
                <th className="w-[12%]">Kunjungan</th>
                <th className="w-[17%]">Total Pendapatan</th>
                <th className="w-[12%]">Kontribusi</th>
                <th className="w-[8%] pr-4 print:pr-3">Peringkat</th>
              </tr>
            </thead>
            <tbody>
              {report.rekap.map((row) => (
                <tr
                  key={`${row.namaLayanan}-${row.poli}`}
                  className="h-11 border-t border-line print:h-9 print:border-gray-300"
                >
                  <td className="pl-4 print:pl-3">{row.peringkat}</td>
                  <td className="break-words font-semibold">
                    {row.namaLayanan}
                  </td>
                  <td>{row.poli}</td>
                  <td>{money(row.tarif)}</td>
                  <td>{row.jumlah}</td>
                  <td>{money(row.pendapatan)}</td>
                  <td>{row.persentase.toFixed(1)}%</td>
                  <td className="pr-4 print:pr-3">
                    <span>#{row.peringkat}</span>
                  </td>
                </tr>
              ))}
              {!report.rekap.length && (
                <tr>
                  <td colSpan={8} className="h-20 text-center text-ink-3">
                    Belum ada data kunjungan pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="print-report-footer">
        Laporan dibuat dari data aktual sistem KlinikPulse
      </footer>
    </div>
  );
}
