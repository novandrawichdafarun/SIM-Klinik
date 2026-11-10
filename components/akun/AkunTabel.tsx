"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Info, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteAkunAction } from "@/actions/akun";
import Avatar from "@/components/ui/Avatar";
import ErrorBox from "@/components/ui/ErrorBox";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Akun, StatusAkunFilter } from "@/types/akun";
import { formatTanggalWaktu, roleLabel } from "@/utils/format";

const FILTERS: { value: StatusAkunFilter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
];

function buildUrl(q: string, status: StatusAkunFilter) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "semua") params.set("status", status);
  const query = params.toString();
  return query ? `/akun?${query}` : "/akun";
}

function subtitle(a: Akun) {
  if (a.role === "super_admin") return roleLabel(a.role);
  return [a.jenisKaryawan ?? roleLabel(a.role), a.namaPoli].filter(Boolean).join(" · ");
}

export default function AkunTabel({
  items,
  currentUserId,
  q,
  status,
}: {
  items: Akun[];
  currentUserId: string;
  q: string;
  status: StatusAkunFilter;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (query === q) return;
    const timer = setTimeout(() => {
      startTransition(() => router.replace(buildUrl(query.trim(), status)));
    }, 400);
    return () => clearTimeout(timer);
  }, [query, q, status, router]);

  async function handleDelete(akun: Akun) {
    const nama = akun.namaLengkap ?? akun.email;
    if (
      !window.confirm(
        `Hapus akun ${nama} (${akun.email})?\n\nKaryawan tetap tersimpan, tetapi tidak bisa login dan hak aksesnya ikut terhapus. Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }
    setError(null);
    setDeletingId(akun.idUser);
    const result = await deleteAkunAction(akun.idUser);
    setDeletingId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      )}

      <section
        aria-busy={isPending}
        className={`overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-opacity ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center">
          <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-line px-3 md:max-w-70">
            <Search aria-hidden="true" size={16} className="shrink-0 text-ink-2" />
            <span className="sr-only">Cari akun</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari email atau nama..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </label>

          <div role="group" aria-label="Filter status akun" className="flex gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={buildUrl(q, f.value)}
                aria-current={status === f.value ? "true" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  status === f.value
                    ? "border-emerald-500 bg-accent-soft text-accent-ink"
                    : "border-line bg-surface hover:bg-surface-hover"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <Link
            href="/akun/tambah"
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 md:ml-auto"
          >
            <Plus aria-hidden="true" size={16} />
            Tambah Akun
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-left text-sm">
            <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
              <tr className="h-10">
                <th className="pl-5">Karyawan</th>
                <th className="px-3">Email</th>
                <th className="px-3">Status Akun</th>
                <th className="px-3">Login Terakhir</th>
                <th className="pr-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const isSelf = a.idUser === currentUserId;
                return (
                  <tr key={a.idUser} className="h-15 border-t border-line">
                    <td className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.namaLengkap ?? a.email} />
                        <div>
                          <p className="flex flex-wrap items-center gap-2 font-semibold">
                            {a.idKaryawan ? (
                              <Link
                                href={`/karyawan/${a.idKaryawan}`}
                                className="hover:text-accent-ink hover:underline"
                              >
                                {a.namaLengkap}
                              </Link>
                            ) : (
                              <span>{a.namaLengkap ?? "(tanpa data karyawan)"}</span>
                            )}
                            {isSelf && (
                              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-ink">
                                Akun Anda
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-ink-3">{subtitle(a)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 break-all">{a.email}</td>
                    <td className="px-3">
                      <StatusBadge active={a.isActive} />
                    </td>
                    <td className="px-3 text-ink-2">{formatTanggalWaktu(a.lastLoginAt)}</td>
                    <td className="pr-5">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/akun/${a.idUser}/ubah`}
                          aria-label={`Ubah akun ${a.email}`}
                          title="Ubah akun"
                          className="grid size-8 place-items-center rounded-lg border border-line hover:bg-surface-hover"
                        >
                          <Pencil aria-hidden="true" size={15} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(a)}
                          disabled={isSelf || deletingId === a.idUser}
                          aria-label={`Hapus akun ${a.email}`}
                          title={isSelf ? "Akun Anda tidak dapat dihapus" : "Hapus akun"}
                          className="grid size-8 place-items-center rounded-lg border border-danger-line bg-danger-soft text-danger-ink hover:bg-danger-line disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-faint"
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="h-24 text-center text-sm text-ink-3">
                    Tidak ada akun yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-1 border-t border-line px-5 py-3 text-xs text-ink-3 sm:flex-row sm:justify-between">
          <span>Menampilkan {items.length} akun</span>
          <span>Akun Anda tidak dapat dihapus saat sedang digunakan.</span>
        </footer>
      </section>

      <p className="mt-5 flex items-start gap-2 rounded-xl bg-info-soft px-4 py-3 text-sm text-info-ink">
        <Info aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
        Akun hanya dapat dibuat untuk karyawan yang sudah terdaftar di Kelola Karyawan. Hak akses
        setiap akun diatur di menu Hak Akses.
      </p>
    </>
  );
}
