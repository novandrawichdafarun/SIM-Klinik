"use client";

import { useMemo } from "react";
import { Info, RotateCcw } from "lucide-react";
import type { UserRole } from "@/types/auth";
import {
  AKSI_HAK_AKSES,
  type AksiHakAkses,
  type Fitur,
  type MatriksHakAkses,
} from "@/types/hak-akses";
import { roleLabel } from "@/utils/format";

const AKSI_LABEL: Record<AksiHakAkses, string> = {
  lihat: "Lihat",
  tambah: "Tambah",
  ubah: "Ubah",
  hapus: "Hapus",
};

/**
 * Matriks hak akses awal di form Tambah Akun.
 * Nilai awalnya dicentang otomatis sesuai role (lihat libs/hak-akses-default.ts),
 * Super Admin boleh menyesuaikan sebelum menyimpan.
 */
export default function HakAksesAwal({
  role,
  fitur,
  matriks,
  onChange,
  onReset,
}: {
  role: UserRole;
  fitur: Fitur[];
  matriks: MatriksHakAkses;
  onChange: (next: MatriksHakAkses) => void;
  onReset: () => void;
}) {
  const isSuperAdmin = role === "super_admin";

  const grup = useMemo(() => {
    const map = new Map<string, Fitur[]>();
    for (const f of fitur) map.set(f.grup, [...(map.get(f.grup) ?? []), f]);
    return [...map.entries()];
  }, [fitur]);

  const aktif = Object.values(matriks).filter(
    (i) => i.lihat || i.tambah || i.ubah || i.hapus,
  ).length;

  function toggle(kode: string, aksi: AksiHakAkses, checked: boolean) {
    const izin = { ...matriks[kode] };
    if (aksi === "lihat" && !checked) {
      izin.lihat = izin.tambah = izin.ubah = izin.hapus = false; // tanpa lihat, aksi lain tidak berarti
    } else {
      izin[aksi] = checked;
      if (checked) izin.lihat = true;
    }
    onChange({ ...matriks, [kode]: izin });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-[15px] font-bold">Hak Akses Awal</h2>
          <p className="mt-0.5 text-xs text-ink-3">
            Dicentang otomatis sesuai role <strong>{roleLabel(role)}</strong>. Bisa disesuaikan
            sekarang atau nanti di menu Hak Akses.
          </p>
        </div>
        {!isSuperAdmin && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold">
              {aktif} dari {fitur.length} fitur aktif
            </span>
            <button
              type="button"
              onClick={onReset}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold hover:bg-surface-hover"
            >
              <RotateCcw aria-hidden="true" size={13} /> Kembalikan default
            </button>
          </div>
        )}
      </header>

      {isSuperAdmin ? (
        <p className="flex items-start gap-2 border-t border-line bg-accent-soft px-5 py-3 text-sm text-accent-ink">
          <Info aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          Super Admin (Pimpinan Klinik) otomatis memiliki seluruh akses.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-140 border-collapse text-sm">
            <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
              <tr className="h-9">
                <th scope="col" className="pl-5 text-left">
                  Fitur
                </th>
                {AKSI_HAK_AKSES.map((a) => (
                  <th key={a} scope="col" className="w-18 text-center">
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
                    className="px-5 pt-3 pb-1 text-left text-[10px] font-bold tracking-wide text-accent-ink uppercase"
                  >
                    {namaGrup}
                  </th>
                </tr>
                {daftar.map((f) => (
                  <tr key={f.kodeFitur} className="border-t border-line">
                    <th scope="row" className="py-2.5 pl-5 text-left font-normal">
                      <span className="block font-semibold">{f.namaFitur}</span>
                      {f.khususSuperAdmin && (
                        <span className="block text-xs text-ink-3">
                          Terkunci: khusus Super Admin
                        </span>
                      )}
                    </th>
                    {AKSI_HAK_AKSES.map((a) => (
                      <td key={a} className="text-center">
                        <input
                          type="checkbox"
                          aria-label={`${AKSI_LABEL[a]} ${f.namaFitur}`}
                          checked={matriks[f.kodeFitur]?.[a] ?? false}
                          disabled={f.khususSuperAdmin}
                          onChange={(e) => toggle(f.kodeFitur, a, e.target.checked)}
                          className="size-4.5 cursor-pointer accent-chart disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </section>
  );
}
