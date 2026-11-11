import Link from "next/link";
import { Suspense } from "react";
import { getKaryawanTanpaAkunAction } from "@/actions/akun";
import AkunForm from "@/components/akun/AkunForm";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Tambah Akun - ERM Klinik Pratama" };

async function TambahAkunForm({
  searchParams,
}: Pick<PageProps<"/akun/tambah">, "searchParams">) {
  const sp = await searchParams;
  const defaultKaryawanId =
    typeof sp.karyawan === "string" ? Number(sp.karyawan) : undefined;

  const result = await getKaryawanTanpaAkunAction();
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }

  if (result.data.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-sm shadow-sm">
        <p>Semua karyawan aktif sudah memiliki akun.</p>
        <Link
          href="/karyawan/tambah"
          className="mt-3 inline-flex font-semibold text-accent-ink hover:underline"
        >
          Tambah karyawan baru terlebih dahulu →
        </Link>
      </div>
    );
  }

  return (
    <AkunForm
      mode="create"
      karyawanOptions={result.data}
      defaultKaryawanId={defaultKaryawanId}
    />
  );
}

export default function TambahAkunPage({
  searchParams,
}: PageProps<"/akun/tambah">) {
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Kelola Akun", href: "/akun" },
            { label: "Tambah Akun" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
          Tambah Akun
        </h1>
        <Suspense
          fallback={
            <div className="h-80 animate-pulse rounded-xl bg-surface" />
          }
        >
          <TambahAkunForm searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
