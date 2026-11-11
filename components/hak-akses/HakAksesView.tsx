"use client";

import { toast } from "@/components/feedback/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Info, Search } from "lucide-react";
import { saveHakAksesAction } from "@/actions/hak-akses";
import Avatar from "@/components/ui/Avatar";
import type { UserRole } from "@/types/auth";
import {
  AKSI_HAK_AKSES,
  type AksiHakAkses,
  type DetailHakAkses,
  type Fitur,
  type MatriksHakAkses,
  type PenggunaHakAkses,
} from "@/types/hak-akses";
import { formatTanggalWaktu, roleLabel } from "@/utils/format";

const ROLE_FILTERS: { value: UserRole | "semua"; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "dokter", label: "Dokter" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const AKSI_LABEL: Record<AksiHakAkses, string> = {
  lihat: "Lihat",
  tambah: "Tambah",
  ubah: "Ubah",
  hapus: "Hapus",
};

function hitungFiturAktif(matriks: MatriksHakAkses): number {
  return Object.values(matriks).filter(
    (i) => i.lihat || i.tambah || i.ubah || i.hapus,
  ).length;
}

function subtitle(p: PenggunaHakAkses) {
  const jabatan =
    p.role === "super_admin"
      ? roleLabel(p.role)
      : (p.jenisKaryawan ?? roleLabel(p.role));
  return [jabatan, p.namaPoli].filter(Boolean).join(" · ");
}

/* ---------------------------------------------------------------- */
/* Panel kiri: daftar karyawan ber-akun                             */
/* ---------------------------------------------------------------- */

function DaftarPengguna({
  pengguna,
  selectedId,
}: {
  pengguna: PenggunaHakAkses[];
  selectedId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "semua">("semua");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pengguna.filter(
      (p) =>
        (role === "semua" || p.role === role) &&
        (!q ||
          `${p.namaLengkap ?? ""} ${p.NIP ?? ""} ${p.email}`
            .toLowerCase()
            .includes(q)),
    );
  }, [pengguna, query, role]);

  return (
    <section className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold">Daftar Karyawan</h2>
        <span className="text-xs text-ink-3">{pengguna.length} akun</span>
      </header>

      <label className="mb-3 flex h-10 items-center gap-2 rounded-lg bg-surface-muted px-3">
        <Search aria-hidden="true" size={15} className="shrink-0 text-ink-2" />
        <span className="sr-only">Cari karyawan</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama atau NIP karyawan..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
      </label>

      <div
        role="group"
        aria-label="Filter role"
        className="mb-3 flex flex-wrap gap-1.5"
      >
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={role === f.value}
            onClick={() => setRole(f.value)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              role === f.value
                ? "bg-accent-soft text-accent-ink"
                : "bg-surface-muted hover:bg-surface-hover"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="-mx-1 max-h-140 flex-1 space-y-1 overflow-y-auto px-1">
        {filtered.map((p) => {
          const active = p.idUser === selectedId;
          return (
            <li key={p.idUser}>
              <Link
                href={`/hak-akses?user=${p.idUser}`}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                  active
                    ? "border-emerald-500 bg-accent-soft"
                    : "border-transparent hover:bg-surface-hover"
                }`}
              >
                <Avatar name={p.namaLengkap ?? p.email} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {p.namaLengkap ?? p.email}
                  </span>
                  <span className="block truncate text-xs text-ink-3">
                    {subtitle(p)}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                      active
                        ? "bg-accent-soft text-accent-ink"
                        : "bg-surface-hover text-ink-2"
                    }`}
                  >
                    {p.jumlahFiturAktif} fitur
                  </span>
                  {!p.isActive && (
                    <span className="text-[10px] text-ink-3">Nonaktif</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-3">
            Tidak ada karyawan yang cocok.
          </li>
        )}
      </ul>

      <p className="mt-3 text-xs text-ink-3">
        Menampilkan {filtered.length} dari {pengguna.length} akun
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Panel kanan: matriks fitur x aksi                                */
/* ---------------------------------------------------------------- */

function MatriksEditor({
  fitur,
  detail,
}: {
  fitur: Fitur[];
  detail: DetailHakAkses;
}) {
  const router = useRouter();
  const { pengguna } = detail;
  const isSuperAdmin = pengguna.role === "super_admin";

  const [matriks, setMatriks] = useState<MatriksHakAkses>(detail.matriks);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();

  const dirty = useMemo(
    () =>
      fitur.some((f) =>
        AKSI_HAK_AKSES.some(
          (a) => matriks[f.kodeFitur]?.[a] !== detail.matriks[f.kodeFitur]?.[a],
        ),
      ),
    [fitur, matriks, detail.matriks],
  );

  const aktif = hitungFiturAktif(matriks);
  const grup = useMemo(() => {
    const map = new Map<string, Fitur[]>();
    for (const f of fitur) map.set(f.grup, [...(map.get(f.grup) ?? []), f]);
    return [...map.entries()];
  }, [fitur]);

  function toggle(kode: string, aksi: AksiHakAkses, checked: boolean) {
    setMatriks((prev) => {
      const izin = { ...prev[kode] };
      if (aksi === "lihat" && !checked) {
        // Tanpa "lihat", aksi lain tidak berarti
        izin.lihat = izin.tambah = izin.ubah = izin.hapus = false;
      } else {
        izin[aksi] = checked;
        if (checked) izin.lihat = true;
      }
      return { ...prev, [kode]: izin };
    });
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await saveHakAksesAction(pengguna.idUser, matriks);
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Hak akses berhasil disimpan.");
    startTransition(() => router.refresh());
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <header className="flex flex-col gap-4 border-b border-line p-5 md:flex-row md:items-center">
        <Avatar name={pengguna.namaLengkap ?? pengguna.email} size="lg" />
        <div className="flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
            {pengguna.namaLengkap ?? pengguna.email}
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent-ink">
              {roleLabel(pengguna.role)}
            </span>
            {!pengguna.isActive && (
              <span className="rounded-full bg-neutral-soft px-2.5 py-0.5 text-[11px] font-semibold text-ink-2">
                Akun nonaktif
              </span>
            )}
          </h2>
          <p className="text-sm text-ink-3">
            {[
              pengguna.NIP && `NIP: ${pengguna.NIP}`,
              pengguna.jenisKaryawan,
              pengguna.namaPoli,
            ]
              .filter(Boolean)
              .join(" · ") || pengguna.email}
          </p>
        </div>
        <div className="w-full md:w-48">
          <p className="mb-1.5 text-right text-sm font-semibold">
            {aktif} dari {fitur.length} fitur aktif
          </p>
          <div
            role="meter"
            aria-label="Fitur aktif"
            aria-valuemin={0}
            aria-valuemax={fitur.length}
            aria-valuenow={aktif}
            className="h-1.5 rounded-full bg-chart-track"
          >
            <div
              className="h-1.5 rounded-full bg-chart transition-all"
              style={{
                width: `${fitur.length ? (aktif / fitur.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </header>

      {isSuperAdmin && (
        <p className="flex items-start gap-2 bg-accent-soft px-5 py-3 text-sm text-info-ink">
          <Info aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          Super Admin (Pimpinan Klinik) selalu memiliki seluruh akses dan tidak
          perlu diatur.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-150 border-collapse text-sm">
          <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
            <tr className="h-10">
              <th scope="col" className="pl-5 text-left">
                Fitur
              </th>
              {AKSI_HAK_AKSES.map((a) => (
                <th key={a} scope="col" className="w-20 text-center">
                  {AKSI_LABEL[a]}
                </th>
              ))}
            </tr>
          </thead>
          {grup.map(([namaGrup, daftar]) => (
            <tbody key={namaGrup}>
              <tr>
                <th
                  colSpan={5}
                  scope="colgroup"
                  className="px-5 pt-4 pb-1 text-left text-[10px] font-bold tracking-wide text-accent-ink uppercase"
                >
                  <span className="mr-1.5 inline-block size-1.5 rounded-full bg-chart align-middle" />
                  {namaGrup}
                </th>
              </tr>
              {daftar.map((f) => {
                const locked = isSuperAdmin || f.khususSuperAdmin;
                return (
                  <tr
                    key={f.kodeFitur}
                    className={`border-t border-line ${locked && !isSuperAdmin ? "bg-surface-muted" : ""}`}
                  >
                    <th scope="row" className="py-3 pl-5 text-left font-normal">
                      <span className="block font-semibold">{f.namaFitur}</span>
                      <span className="block text-xs text-ink-3">
                        {f.khususSuperAdmin
                          ? "Terkunci: khusus Super Admin"
                          : f.deskripsi}
                      </span>
                    </th>
                    {AKSI_HAK_AKSES.map((a) => (
                      <td key={a} className="text-center">
                        <input
                          type="checkbox"
                          aria-label={`${AKSI_LABEL[a]} ${f.namaFitur}`}
                          checked={matriks[f.kodeFitur]?.[a] ?? false}
                          disabled={locked || isSaving}
                          onChange={(e) =>
                            toggle(f.kodeFitur, a, e.target.checked)
                          }
                          className="size-4.5 cursor-pointer accent-chart disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      <footer className="flex flex-col gap-4 border-t border-line p-5 md:flex-row md:items-center">
        <div className="flex flex-1 items-start gap-2 text-xs text-ink-3">
          <Info aria-hidden="true" size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-ink-2">
              Perubahan langsung berlaku pada akses karyawan berikutnya.
            </p>
            {detail.terakhirDiubah && (
              <p>
                Terakhir diubah{" "}
                {formatTanggalWaktu(detail.terakhirDiubah.waktu)}
                {detail.terakhirDiubah.oleh &&
                  ` oleh ${detail.terakhirDiubah.oleh}`}
              </p>
            )}
          </div>
        </div>
        {!isSuperAdmin && (
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!dirty || isSaving}
              onClick={() => {
                setMatriks(detail.matriks);
              }}
              className="h-10 rounded-lg bg-surface-hover px-5 text-sm font-semibold hover:bg-surface-hover disabled:opacity-50"
            >
              Batalkan
            </button>
            <button
              type="button"
              disabled={!dirty || isSaving}
              onClick={handleSave}
              className="h-10 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Hak Akses"}
            </button>
          </div>
        )}
      </footer>

    </section>
  );
}

export default function HakAksesView({
  fitur,
  pengguna,
  detail,
}: {
  fitur: Fitur[];
  pengguna: PenggunaHakAkses[];
  detail: DetailHakAkses | null;
}) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[340px_1fr]">
      <DaftarPengguna
        pengguna={pengguna}
        selectedId={detail?.pengguna.idUser ?? null}
      />
      {detail ? (
        // key: reset state matriks ketika karyawan yang dipilih berganti
        <MatriksEditor
          key={detail.pengguna.idUser}
          fitur={fitur}
          detail={detail}
        />
      ) : (
        <section className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-3 shadow-sm">
          Belum ada akun karyawan. Buat akun terlebih dahulu di menu Kelola
          Akun.
        </section>
      )}
    </div>
  );
}
