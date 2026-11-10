import Link from "next/link";
import { KeyRound, Pencil, ShieldCheck, Star } from "lucide-react";
import MonthlyChart from "@/components/charts/MonthlyChart";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import type { KaryawanDetailPageData, RatingDokterStats } from "@/types/kinerja";
import { formatDesimal, formatTanggal, formatTanggalWaktu, roleLabel } from "@/utils/format";
import PeriodeSelect from "./PeriodeSelect";

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          size={size}
          className={i <= value ? "fill-chart text-chart" : "text-ink-faint"}
        />
      ))}
    </span>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right font-semibold break-all text-ink">{children}</dd>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

/** Baris "label .... angka" + bar proporsi (track = langkah lebih terang dari hijau yang sama) */
function ProportionRow({
  label,
  value,
  total,
}: {
  label: React.ReactNode;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-semibold tabular-nums">{value.toLocaleString("id-ID")}</span>
      </div>
      <div className="h-1.5 rounded-full bg-chart-track">
        <div className="h-1.5 rounded-full bg-chart" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ratingDomain(rating: RatingDokterStats): [number, number] {
  const values = rating.ratingPerBulan.map((b) => b.nilai).filter((v): v is number => v !== null);
  if (values.length === 0) return [4, 5];
  const min = Math.max(1, Math.floor(Math.min(...values) * 2) / 2 - 0.5);
  return [Math.min(min, 4), 5];
}

export default function KaryawanDetailView({ data }: { data: KaryawanDetailPageData }) {
  const { karyawan: k, rating, kinerja, periode } = data;
  const subtitle = [k.jenisKaryawan, k.namaPoli].filter(Boolean).join(" · ");

  const tingkatUlasan =
    kinerja.pasienDitangani > 0
      ? `${Math.round((rating.jumlahUlasan / kinerja.pasienDitangani) * 100)}%`
      : "–";

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
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Rating"
              value={rating.rataRata !== null ? `${formatDesimal(rating.rataRata)} / 5` : "–"}
            />
            <StatTile label="Jumlah ulasan" value={rating.jumlahUlasan.toLocaleString("id-ID")} />
            <StatTile
              label="Pasien ditangani"
              value={kinerja.pasienDitangani.toLocaleString("id-ID")}
            />
            <StatTile label="Tingkat ulasan" value={tingkatUlasan} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Rating per Bulan">
              <MonthlyChart
                type="line"
                data={rating.ratingPerBulan}
                label="Rata-rata rating per bulan"
                decimals={1}
                yDomain={ratingDomain(rating)}
                emptyText="Belum ada rating pada periode ini."
              />
            </Card>
            <Card title="Pasien per Bulan">
              <MonthlyChart
                type="bar"
                data={kinerja.pasienPerBulan}
                label="Jumlah pasien ditangani per bulan"
                emptyText="Belum ada pasien ditangani pada periode ini."
              />
            </Card>

            <Card title="Distribusi Rating">
              {rating.jumlahUlasan > 0 ? (
                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map((bintang) => (
                    <ProportionRow
                      key={bintang}
                      label={
                        <span className="flex items-center gap-1">
                          {bintang}
                          <Star
                            aria-hidden="true"
                            size={13}
                            className="fill-chart text-chart"
                          />
                          <span className="sr-only">bintang</span>
                        </span>
                      }
                      value={rating.distribusi[bintang - 1]}
                      total={rating.jumlahUlasan}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-3">Belum ada rating pada periode ini.</p>
              )}
            </Card>

            <Card title="Layanan Ditangani">
              {kinerja.layananDitangani.length > 0 ? (
                <div className="space-y-3">
                  {kinerja.layananDitangani.map((l) => (
                    <ProportionRow
                      key={l.namaLayanan}
                      label={l.namaLayanan}
                      value={l.jumlah}
                      total={kinerja.pasienDitangani}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-3">
                  Belum ada layanan ditangani pada periode ini.
                </p>
              )}
            </Card>
          </div>

          <Card title="Ulasan Terbaru">
            {rating.ulasanTerbaru.length > 0 ? (
              <ul className="divide-y divide-line">
                {rating.ulasanTerbaru.map((u) => (
                  <li
                    key={u.idRating}
                    className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:gap-4"
                  >
                    <Stars value={u.nilai} />
                    <p className="flex-1">{u.ulasan}</p>
                    <time className="text-xs text-ink-3">{formatTanggal(u.tanggal)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">
                Belum ada ulasan dari pengunjung pada periode ini.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
