import Link from "next/link";
import { KeyRound, Pencil, ShieldCheck, Star } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import type { KaryawanDetailPageData } from "@/types/kinerja";
import { formatDesimal, formatTanggalWaktu, roleLabel } from "@/utils/format";
import KinerjaStatistik from "./KinerjaStatistik";
import PeriodeSelect from "./PeriodeSelect";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right font-semibold break-all text-ink">{children}</dd>
    </div>
  );
}

export default function KaryawanDetailView({ data }: { data: KaryawanDetailPageData }) {
  const { karyawan: k, rating, kinerja, periode } = data;
  const subtitle = [k.jenisKaryawan, k.namaPoli].filter(Boolean).join(" · ");

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-[25px] font-bold tracking-tight md:text-[28px]">{k.namaLengkap}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodeSelect value={periode.bulan} />
          <Link
            href={`/karyawan/${k.idKaryawan}/ubah`}
            className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold shadow-sm hover:bg-surface-hover"
          >
            <Pencil aria-hidden="true" size={15} />
            Ubah Data
          </Link>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(300px,360px)_1fr]">
        {/* Kolom kiri: profil, data karyawan, akun */}
        <div className="space-y-5">
          <section className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
            <Avatar name={k.namaLengkap} size="lg" />
            <div>
              <p className="text-sm font-semibold">{subtitle || "-"}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-2">
                <Star aria-hidden="true" size={14} className="fill-chart text-chart" />
                {rating.rataRata !== null
                  ? `${formatDesimal(rating.rataRata)} · ${rating.jumlahUlasan} ulasan`
                  : "Belum ada rating"}
              </p>
            </div>
          </section>

          <Card title="Data Karyawan">
            <dl>
              <InfoRow label="ID karyawan (NIP)">{k.NIP}</InfoRow>
              <InfoRow label="Nama lengkap">{k.namaLengkap}</InfoRow>
              <InfoRow label="No. identitas (NIK)">{k.NIK}</InfoRow>
              <InfoRow label="Jabatan">{k.jenisKaryawan}</InfoRow>
              <InfoRow label="Poli">{k.namaPoli}</InfoRow>
              <InfoRow label="No. HP">{k.noHp ?? "-"}</InfoRow>
              <InfoRow label="Nomor STR">{k.STR ?? "-"}</InfoRow>
              <InfoRow label="Nomor SIP">{k.SIP ?? "-"}</InfoRow>
              <InfoRow label="Status">
                <StatusBadge active={k.statusAktif} />
              </InfoRow>
            </dl>
          </Card>

          <Card title="Akun">
            {k.idUser ? (
              <>
                <dl>
                  <InfoRow label="Email">{k.email}</InfoRow>
                  <InfoRow label="Role">{roleLabel(k.role)}</InfoRow>
                  <InfoRow label="Status akun">
                    <StatusBadge active={k.akunAktif === true} />
                  </InfoRow>
                  <InfoRow label="Login terakhir">{formatTanggalWaktu(k.lastLoginAt)}</InfoRow>
                  <InfoRow label="Hak akses">{k.jumlahFiturAktif} fitur</InfoRow>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/hak-akses?user=${k.idUser}`}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold hover:bg-surface-hover"
                  >
                    <ShieldCheck aria-hidden="true" size={14} /> Atur hak akses
                  </Link>
                  <Link
                    href={`/akun/${k.idUser}/ubah`}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold hover:bg-surface-hover"
                  >
                    <Pencil aria-hidden="true" size={14} /> Ubah akun
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-sm text-ink-3">
                <p>Karyawan ini belum memiliki akun login.</p>
                {k.statusAktif && (
                  <Link
                    href={`/akun/tambah?karyawan=${k.idKaryawan}`}
                    className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600"
                  >
                    <KeyRound aria-hidden="true" size={14} /> Buat akun
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Kolom kanan: statistik — untuk semua karyawan, termasuk Pimpinan Klinik */}
        <KinerjaStatistik rating={rating} kinerja={kinerja} />
      </div>
    </>
  );
}
