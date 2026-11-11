import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

export default function ForbiddenView() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-danger-soft via-surface to-background px-6 py-16">
      {/* Ornamen dekoratif */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-danger-soft/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl dark:bg-amber-500/10" />

      <div className="relative w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/25">
          <ShieldAlert className="h-10 w-10" strokeWidth={1.75} />
        </div>

        <p className="mt-8 bg-linear-to-r from-red-500 to-red-700 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-7xl">
          403
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
          Akses ditolak
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink-3 sm:text-base">
          Maaf, Anda tidak memiliki otoritas atau izin yang cukup untuk
          mengakses halaman ini.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Kembali ke Beranda
          </Link>
        </div>

        <p className="mt-8 inline-flex items-center gap-1.5 text-xs text-ink-faint">
          <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
          Kode kesalahan: 403 Forbidden
        </p>
      </div>
    </main>
  );
}
