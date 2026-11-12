"use client";

import { konfirmasi } from "@/components/feedback/konfirmasi";
import { toast } from "@/components/feedback/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { deletePasienAction } from "@/actions/rekap-pasien";
import Avatar from "@/components/ui/Avatar";
import type { AksesRekap, Pasien, RiwayatPenanganan } from "@/types/rekap-pasien";
import { formatTanggal, hitungUsia } from "@/utils/format";
import { StatusKunjunganBadge } from "./KunjunganView";

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
/** "1992-09-23" → "23 September 1992" */
const tanggalPanjang = (v: string | null) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
};

function Info({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-3" : undefined}>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{value || "-"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-[15px] font-bold">{title}</h2>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

function formatNomorHp(value: string | null) {
  if (!value) return "-";
  const angka = value.replace(/\D/g, "");
  const lokal = angka.startsWith("62")
    ? angka.slice(2)
    : angka.startsWith("0")
      ? angka.slice(1)
      : angka;
  const bagian = /^(\d{3})(\d{3,4})(\d*)$/.exec(lokal);
  return bagian ? `+62 ${bagian[1]}-${bagian[2]}${bagian[3] ? `-${bagian[3]}` : ""}` : `+62 ${lokal}`;
}

function RingkasanIdentitas({
  pasien,
  usia,
  kelamin,
  isBpjs,
  ringkasDokter = false,
}: {
  pasien: Pasien;
  usia: number | null;
  kelamin: string;
  isBpjs: boolean;
  ringkasDokter?: boolean;
}) {
  const nikValid = /^\d{16}$/.test(pasien.NIK);
  const baris: [string, string][] = [
    ["No. RM", pasien.NoRM],
    ["NIK", pasien.NIK],
    ...(!ringkasDokter && nikValid ? [["Validasi Dukcapil", "Terverifikasi"] as [string, string]] : []),
    ...(!ringkasDokter ? [["Terdaftar sejak", formatTanggal(pasien.createdAt)] as [string, string]] : []),
    ...(ringkasDokter ? [["No. BPJS", pasien.noBpjs ?? "-"] as [string, string]] : []),
  ];

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar name={pasien.namaLengkap} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {kelamin}
            {usia !== null && ` · ${usia} tahun`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-avatar px-2 py-0.5 text-[11px] font-semibold text-avatar-ink">
              {isBpjs ? "BPJS" : pasien.jenisPenjamin}
            </span>
            {pasien.golonganDarah && (
              <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                Gol. darah {pasien.golonganDarah}
              </span>
            )}
          </div>
        </div>
      </div>
      <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
        {baris.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-ink-3">{label}</dt>
            <dd
              className={`text-right font-semibold tabular-nums ${
                label === "Validasi Dukcapil" ? "rounded-full bg-accent-soft px-2 text-accent-ink" : ""
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DetailKunjungan({ kunjungan }: { kunjungan: RiwayatPenanganan }) {
  const vital = [
    ["Tekanan darah", kunjungan.tekananDarah ? `${kunjungan.tekananDarah} mmHg` : "-"],
    ["Suhu", kunjungan.suhu === null ? "-" : `${kunjungan.suhu} C`],
    ["Nadi", kunjungan.nadi === null ? "-" : `${kunjungan.nadi} x/menit`],
    ["Laju napas", kunjungan.lajuNapas === null ? "-" : `${kunjungan.lajuNapas} x/menit`],
  ];
  const rincian = [
    ["Keluhan", kunjungan.keluhan],
    ["Diagnosa", kunjungan.diagnosa],
    ["Resep", kunjungan.resepObat],
    ["Catatan dokter", kunjungan.catatanDokter],
  ] as const;

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-[15px] font-bold">
        {formatTanggal(kunjungan.tanggal)} · {kunjungan.namaPoli}
      </h2>
      <p className="mt-1 text-xs text-ink-3">{kunjungan.kodeKunjungan}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {vital.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface-muted p-3">
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="mt-1 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {rincian.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="mt-1 text-sm font-medium break-words whitespace-pre-wrap">{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function PasienDetailView({
  pasien: p,
  riwayat,
  akses,
}: {
  pasien: Pasien;
  riwayat: RiwayatPenanganan[];
  akses: AksesRekap;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"identitas" | "riwayat">("identitas");
  const [selectedId, setSelectedId] = useState<number | null>(() => riwayat[0]?.idKunjungan ?? null);
  const [isPending, startTransition] = useTransition();
  const usia = hitungUsia(p.tanggalLahir);
  const kelamin = p.jenisKelamin === "P" ? "Perempuan" : "Laki-laki";
  const isBpjs = p.jenisPenjamin === "BPJS Kesehatan (JKN)";
  const hanyaDokter = akses.hanyaDokter;
  const bisaKelola = akses.bisaUbahPasien || akses.bisaHapusPasien;
  const selected = riwayat.find((item) => item.idKunjungan === selectedId) ?? null;
  const kembaliHref = hanyaDokter ? "/rekap-pasien?tab=saya" : "/rekap-pasien?tab=semua";

  async function hapus() {
    const setuju = await konfirmasi({
      judul: `Hapus pasien ${p.namaLengkap}?`,
      pesan: "Pasien yang memiliki riwayat kunjungan tidak dapat dihapus. Penghapusan data pasien tanpa riwayat tidak dapat dibatalkan.",
      teksYa: "Ya, hapus",
      tipe: "bahaya",
    });
    if (!setuju) return;
    startTransition(async () => {
      const res = await deletePasienAction(p.idPasien);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Pasien ${p.namaLengkap} berhasil dihapus.`);
      router.replace("/rekap-pasien?tab=semua");
    });
  }

  return (
    <div className={!hanyaDokter && bisaKelola ? "pb-20 md:pb-0" : undefined}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href={kembaliHref}
          aria-label="Kembali ke rekap pasien"
          className="grid size-9 place-items-center rounded-lg border border-line bg-surface hover:bg-surface-hover md:hidden"
        >
          <ArrowLeft aria-hidden="true" size={17} />
        </Link>
        <h1 className="text-[25px] font-bold tracking-tight md:text-[28px]">{p.namaLengkap}</h1>
        {!hanyaDokter && (
          <div className="ml-auto hidden gap-2 md:flex">
            {akses.bisaUbahPasien && (
              <Link
                href={`/rekap-pasien/pasien/${p.idPasien}/ubah`}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-semibold shadow-sm hover:bg-surface-hover"
              >
                <Pencil aria-hidden="true" size={15} /> Ubah Data
              </Link>
            )}
            {akses.bisaHapusPasien && (
              <button
                type="button"
                onClick={hapus}
                disabled={isPending}
                aria-label={`Hapus pasien ${p.namaLengkap}`}
                title="Hapus pasien"
                className="grid size-10 place-items-center rounded-lg border border-danger-line bg-danger-soft text-danger-ink hover:bg-danger-line disabled:opacity-60"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {hanyaDokter ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(240px,280px)_1fr]">
          <RingkasanIdentitas
            pasien={p}
            usia={usia}
            kelamin={kelamin}
            isBpjs={isBpjs}
            ringkasDokter
          />
          <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
              <header className="p-5">
                <h2 className="text-[15px] font-bold">Riwayat Kunjungan</h2>
              </header>
              {riwayat.length ? (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-140 border-collapse text-left text-sm">
                      <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
                        <tr className="h-10">
                          <th className="pl-5">Tanggal</th>
                          <th className="px-3">Layanan</th>
                          <th className="px-3">Dokter</th>
                          <th className="px-3">Diagnosa</th>
                          <th className="pr-5"><span className="sr-only">Detail</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {riwayat.map((item) => (
                          <tr
                            key={item.idKunjungan}
                            role="button"
                            tabIndex={0}
                            aria-pressed={selectedId === item.idKunjungan}
                            onClick={() => setSelectedId(item.idKunjungan)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedId(item.idKunjungan);
                              }
                            }}
                            className={`h-12 cursor-pointer border-t border-line hover:bg-surface-hover ${
                              selectedId === item.idKunjungan ? "bg-accent-soft/50" : ""
                            }`}
                          >
                            <td className="pl-5 whitespace-nowrap">{formatTanggal(item.tanggal)}</td>
                            <td className="px-3">{item.namaLayanan}</td>
                            <td className="px-3">{item.namaDokter ?? "-"}</td>
                            <td className="px-3">{item.diagnosa ?? "-"}</td>
                            <td className="pr-5 text-right">
                              <ChevronRight aria-hidden="true" size={16} className="inline-block text-ink-3" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-line md:hidden">
                    {riwayat.map((item) => (
                      <button
                        key={item.idKunjungan}
                        type="button"
                        aria-pressed={selectedId === item.idKunjungan}
                        onClick={() => setSelectedId(item.idKunjungan)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left ${
                          selectedId === item.idKunjungan ? "bg-accent-soft/50" : "hover:bg-surface-hover"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-ink-3">{formatTanggal(item.tanggal)}</span>
                          <span className="mt-0.5 block truncate text-sm font-semibold">{item.namaLayanan}</span>
                          <span className="mt-1 block text-xs text-ink-2">
                            {item.namaDokter ?? "-"} · {item.diagnosa ?? "-"}
                          </span>
                        </span>
                        <ChevronRight aria-hidden="true" size={16} className="mt-1 shrink-0 text-ink-3" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="px-5 pb-5 text-sm text-ink-3">Belum ada riwayat penanganan.</p>
              )}
            </section>
            {selected && <DetailKunjungan kunjungan={selected} />}
          </div>
        </div>
      ) : (
        <>
          <div role="tablist" className="mb-5 flex gap-6 border-b border-line">
            {(["identitas", "riwayat"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-semibold transition ${
                  tab === t
                    ? "border-emerald-500 text-ink"
                    : "border-transparent text-ink-3 hover:text-ink"
                }`}
              >
                {t === "identitas" ? "Identitas" : "Riwayat Penanganan"}
              </button>
            ))}
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,340px)_1fr]">
            <RingkasanIdentitas pasien={p} usia={usia} kelamin={kelamin} isBpjs={isBpjs} />
            {tab === "identitas" ? (
              <div className="space-y-5">
                <Section title="Data Demografi">
                  <Info label="Nama lengkap" value={p.namaLengkap} />
                  <Info label="Tempat lahir" value={p.tempatLahir} />
                  <Info label="Tanggal lahir" value={tanggalPanjang(p.tanggalLahir)} />
                  <Info label="Usia" value={usia !== null ? `${usia} tahun` : null} />
                  <Info label="Jenis kelamin" value={kelamin} />
                  <Info label="Golongan darah" value={p.golonganDarah} />
                  <Info label="Status pernikahan" value={p.statusPernikahan} />
                  <Info label="Agama" value={p.agama} />
                  <Info label="Pekerjaan" value={p.pekerjaan} />
                </Section>
                <Section title="Kontak & Alamat">
                  <Info label="Nomor WhatsApp" value={formatNomorHp(p.noHp)} />
                  <Info label="Email" value={p.email} />
                  <Info
                    label="Alamat domisili"
                    value={p.alamatDomisili ?? (p.alamat ? "Sama dengan KTP" : null)}
                  />
                  <Info label="Alamat lengkap (KTP)" value={p.alamat} wide />
                  <Info label="Kecamatan" value={p.kecamatan} />
                  <Info label="Kota / Kabupaten" value={p.kotaKabupaten} />
                  <Info label="Provinsi" value={p.provinsi} />
                </Section>
                <Section title="Penjamin & Asuransi">
                  <Info label="Jenis penjamin" value={p.jenisPenjamin} />
                  <Info label="Nomor kartu BPJS" value={p.noBpjs} />
                  <Info label="FKTP asal" value={p.fktpAsal} />
                </Section>
              </div>
            ) : (
              <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-2 p-5">
                  <h2 className="text-[15px] font-bold">Riwayat Penanganan</h2>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-180 border-collapse text-left text-sm">
                    <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
                      <tr className="h-10">
                        <th className="pl-5">Tanggal</th>
                        <th className="px-3">ID Kunjungan</th>
                        <th className="px-3">Poli / Layanan</th>
                        <th className="px-3">Dokter</th>
                        <th className="px-3">Perawat</th>
                        <th className="px-3">Diagnosa</th>
                        <th className="pr-5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riwayat.map((r) => (
                        <tr key={r.idKunjungan} className="h-13 border-t border-line">
                          <td className="pl-5 whitespace-nowrap">
                            {formatTanggal(r.tanggal)}, {r.jam.replace(":", ".")}
                          </td>
                          <td className="px-3 text-ink-3">{r.kodeKunjungan}</td>
                          <td className="px-3">
                            {r.namaPoli}
                            <span className="block text-xs text-ink-3">{r.namaLayanan}</span>
                          </td>
                          <td className="px-3">{r.namaDokter ?? "-"}</td>
                          <td className="px-3">{r.namaPerawat ?? "-"}</td>
                          <td className="px-3">{r.diagnosa ?? "-"}</td>
                          <td className="pr-5">
                            <StatusKunjunganBadge status={r.status} />
                          </td>
                        </tr>
                      ))}
                      {riwayat.length === 0 && (
                        <tr>
                          <td colSpan={7} className="h-24 text-center text-sm text-ink-3">
                            Belum ada riwayat penanganan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
          {bisaKelola && (
            <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-line bg-surface p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
              {akses.bisaHapusPasien && (
                <button
                  type="button"
                  onClick={hapus}
                  disabled={isPending}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-danger-line bg-surface text-sm font-semibold text-danger-ink disabled:opacity-60"
                >
                  <Trash2 aria-hidden="true" size={15} /> Hapus
                </button>
              )}
              {akses.bisaUbahPasien && (
                <Link
                  href={`/rekap-pasien/pasien/${p.idPasien}/ubah`}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 text-sm font-semibold text-white"
                >
                  <Pencil aria-hidden="true" size={15} /> Ubah Data
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
