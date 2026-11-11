"use client";

import { konfirmasi } from "@/components/feedback/konfirmasi";
import { toast } from "@/components/feedback/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock, Pencil, Trash2 } from "lucide-react";
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
  const [isPending, startTransition] = useTransition();
  const usia = hitungUsia(p.tanggalLahir);
  const kelamin = p.jenisKelamin === "P" ? "Perempuan" : "Laki-laki";
  const isBpjs = p.jenisPenjamin === "BPJS Kesehatan (JKN)";

  async function hapus() {
    const setuju = await konfirmasi({
      judul: `Hapus pasien ${p.namaLengkap}?`,
      pesan: `Data pasien ${p.NoRM} beserta riwayatnya akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
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
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[25px] font-bold tracking-tight md:text-[28px]">{p.namaLengkap}</h1>
        <div className="flex gap-2">
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
      </div>

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
        {/* Kartu ringkas */}
        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar name={p.namaLengkap} size="lg" />
            <div>
              <p className="text-sm font-semibold">
                {kelamin}
                {usia !== null && ` · ${usia} tahun`}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-avatar px-2 py-0.5 text-[11px] font-semibold text-avatar-ink">
                  {isBpjs ? "BPJS" : p.jenisPenjamin}
                </span>
                {p.golonganDarah && (
                  <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                    Gol. darah {p.golonganDarah}
                  </span>
                )}
              </div>
            </div>
          </div>
          <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
            {[
              ["No. RM", p.NoRM],
              ["NIK", p.NIK],
              ["Terdaftar sejak", formatTanggal(p.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-ink-3">{label}</dt>
                <dd className="font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

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
              <Info label="Nomor WhatsApp" value={p.noHp} />
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
              {!akses.bisaLihatDiagnosa && (
                <p className="flex items-center gap-1.5 text-xs text-ink-3">
                  <Lock aria-hidden="true" size={13} /> Diagnosa hanya dapat dilihat dokter
                </p>
              )}
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
                    {akses.bisaLihatDiagnosa && <th className="px-3">Diagnosa</th>}
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
                      {akses.bisaLihatDiagnosa && <td className="px-3">{r.diagnosa ?? "-"}</td>}
                      <td className="pr-5">
                        <StatusKunjunganBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                  {riwayat.length === 0 && (
                    <tr>
                      <td colSpan={7} className="h-24 text-center text-sm text-ink-3">
                        Belum ada riwayat kunjungan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
