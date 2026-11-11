"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { KaryawanListResult } from "@/types/karyawan";
import { roleLabel } from "@/utils/format";

type Props = KaryawanListResult & { q: string };

function buildUrl(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/karyawan?${query}` : "/karyawan";
}

/** Menghasilkan mis. [1, 2, "...", 7] */
function getPageNumbers(
  current: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 5)
    return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = [1, current - 1, current, current + 1, totalPages]
    .filter((p, i, arr) => p >= 1 && p <= totalPages && arr.indexOf(p) === i)
    .sort((a, b) => a - b);

  const result: (number | "...")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push("...");
    result.push(p);
  });
  return result;
}

const navClass =
  "flex items-center gap-1 rounded-md bg-surface-hover px-2 py-1.5 text-[9px]";
const iconLinkClass =
  "grid size-8 place-items-center rounded-lg border border-line text-ink transition hover:bg-surface-hover hover:text-accent-ink";

export default function KaryawanTabel({
  items,
  total,
  page,
  pageSize,
  q,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [isPending, startTransition] = useTransition();

  // Debounce: ubah URL 400ms setelah berhenti mengetik, kembali ke halaman 1
  useEffect(() => {
    if (query === q) return;
    const timer = setTimeout(() => {
      startTransition(() => router.replace(buildUrl(query.trim(), 1)));
    }, 400);
    return () => clearTimeout(timer);
  }, [query, q, router]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <>
      <div className="mb-5 flex flex-col items-start gap-3 md:flex-row md:items-center">
        <label className="flex h-14.5 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-sm md:h-11.5 md:max-w-190">
          <Search
            aria-hidden="true"
            size={19}
            className="shrink-0 text-ink-2"
          />
          <span className="sr-only">Cari karyawan</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama karyawan, NIK, NIP, atau nomor STR..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-ink-3"
          />
        </label>

        <Link
          href="/karyawan/tambah"
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-[12px] font-semibold text-white shadow-md transition hover:bg-emerald-600 md:ml-auto"
        >
          <UserRoundPlus aria-hidden="true" size={16} />
          <Plus aria-hidden="true" size={14} className="-ml-2" />
          Tambah Karyawan Baru
        </Link>
      </div>

      <section
        aria-busy={isPending}
        className={`overflow-hidden rounded-xl bg-surface shadow-sm transition-opacity ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-212.5 border-collapse text-left">
            <thead className="bg-surface-muted">
              <tr className="h-10 text-[10px] font-bold text-ink-2">
                <th className="pl-4">KARYAWAN &amp; NIP</th>
                <th className="px-3">PERAN / HAK AKSES</th>
                <th className="px-3">JABATAN &amp; UNIT KERJA</th>
                <th className="px-3">NIK &amp; KONTAK</th>
                <th className="px-3">LEGALITAS STR / SIP</th>
                <th className="px-3">AKSI</th>
              </tr>
            </thead>

            <tbody>
              {items.map((k) => (
                <tr
                  key={k.idKaryawan}
                  className="h-21.25 border-t border-line text-[9px] text-ink"
                >
                  {/* KARYAWAN & NIP */}
                  <td className="pl-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={k.namaLengkap} />
                      <span>
                        <Link
                          href={`/karyawan/${k.idKaryawan}`}
                          className="block text-[12px] font-bold hover:text-accent-ink hover:underline"
                        >
                          {k.namaLengkap}
                        </Link>
                        <small className="mt-1 block text-[10px]">
                          NIP: {k.NIP} <span className="text-chart">●</span>{" "}
                          {k.namaPoli}
                        </small>
                      </span>
                    </div>
                  </td>

                  {/* PERAN / HAK AKSES */}
                  <td className="px-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {k.role ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[10px] text-accent-ink">
                          <span className="size-1.5 rounded-full bg-emerald-700" />
                          {roleLabel(k.role)}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-surface-hover px-2.5 py-1 text-[10px] text-ink-3">
                          Belum ada akun
                        </span>
                      )}
                      {!k.statusAktif && (
                        <span className="inline-flex rounded-full bg-neutral-soft px-2.5 py-1 text-[10px] text-ink-3">
                          Nonaktif
                        </span>
                      )}
                    </div>
                  </td>

                  {/* JABATAN & UNIT KERJA */}
                  <td className="px-3">
                    <p className="font-semibold text-[12px] text-ink">
                      {k.jenisKaryawan}
                    </p>
                    <small className="mt-1 block text-[10px]">
                      {k.namaPoli}
                    </small>
                  </td>

                  {/* NIK & KONTAK */}
                  <td className="px-3">
                    <p className="font-semibold text-[12px] text-ink">
                      {k.NIK}
                    </p>
                    <small className="mt-1 flex items-center gap-1 text-[10px] text-accent-ink">
                      <MessageSquareText aria-hidden="true" size={10} />
                      {k.noHp ?? "-"}
                    </small>
                  </td>

                  {/* LEGALITAS STR / SIP */}
                  <td className="px-3">
                    {k.STR || k.SIP ? (
                      <>
                        {k.STR && (
                          <p className="font-semibold text-[12px] text-ink">
                            STR: {k.STR}
                          </p>
                        )}
                        {k.SIP && (
                          <small className="mt-1 block text-[10px]">
                            SIP: {k.SIP}
                          </small>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-3">-</span>
                    )}
                  </td>

                  {/* AKSI */}
                  <td className="px-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/karyawan/${k.idKaryawan}`}
                        aria-label={`Lihat detail ${k.namaLengkap}`}
                        title="Lihat detail"
                        className={iconLinkClass}
                      >
                        <Eye aria-hidden="true" size={16} />
                      </Link>
                      <Link
                        href={`/karyawan/${k.idKaryawan}/ubah`}
                        aria-label={`Ubah data ${k.namaLengkap}`}
                        title="Ubah data"
                        className={iconLinkClass}
                      >
                        <Pencil aria-hidden="true" size={16} />
                      </Link>
                      {k.idUser ? (
                        <Link
                          href={`/hak-akses?user=${k.idUser}`}
                          aria-label={`Atur hak akses ${k.namaLengkap}`}
                          title="Atur hak akses"
                          className={iconLinkClass}
                        >
                          <ShieldCheck aria-hidden="true" size={16} />
                        </Link>
                      ) : (
                        <Link
                          href={`/akun/tambah?karyawan=${k.idKaryawan}`}
                          aria-label={`Buat akun untuk ${k.namaLengkap}`}
                          title="Buat akun"
                          className={iconLinkClass}
                        >
                          <KeyRound aria-hidden="true" size={16} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="h-24 text-center text-sm text-ink-3"
                  >
                    {q
                      ? `Tidak ada karyawan yang cocok dengan "${q}".`
                      : "Belum ada data karyawan."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex min-h-12 items-center justify-between gap-3 bg-surface-muted px-4 text-[10px] text-ink-2">
          <span>
            Menampilkan{" "}
            <strong>
              {from} - {to}
            </strong>{" "}
            dari <strong>{total}</strong> Karyawan Terdaftar
          </span>

          <nav aria-label="Halaman" className="flex items-center gap-1">
            {page > 1 ? (
              <Link href={buildUrl(q, page - 1)} className={navClass}>
                <ChevronLeft aria-hidden="true" size={14} /> Sebelumnya
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={`${navClass} text-ink-faint`}
              >
                <ChevronLeft aria-hidden="true" size={14} /> Sebelumnya
              </span>
            )}

            <span className="hidden items-center gap-1 sm:flex">
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-1">
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={buildUrl(q, p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`rounded-md px-2.5 py-1.5 text-[9px] ${
                      p === page
                        ? "bg-emerald-500 text-white"
                        : "hover:bg-surface-hover"
                    }`}
                  >
                    {p}
                  </Link>
                ),
              )}
            </span>

            {page < totalPages ? (
              <Link href={buildUrl(q, page + 1)} className={navClass}>
                Selanjutnya <ChevronRight aria-hidden="true" size={14} />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={`${navClass} text-ink-faint`}
              >
                Selanjutnya <ChevronRight aria-hidden="true" size={14} />
              </span>
            )}
          </nav>
        </footer>
      </section>
    </>
  );
}
