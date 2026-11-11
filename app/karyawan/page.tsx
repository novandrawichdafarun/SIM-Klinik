import { Suspense } from "react";
import KaryawanList from "@/components/karyawan/KaryawanList";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const metadata = { title: "Kelola Karyawan - ERM Klinik Pratama" };

export default function KaryawanPage({ searchParams }: PageProps<"/karyawan">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "SDM & Kepegawaian" },
            { label: "Kelola Data Karyawan" },
          ]}
        />
        <h1 className="mb-5 text-[25px] font-bold tracking-tight md:mb-8 md:text-[28px]">
          Kelola Data Karyawan
        </h1>

        {/* searchParams & session dibaca di dalam Suspense (wajib karena cacheComponents) */}
        <Suspense
          fallback={<div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />}
        >
          <KaryawanList searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
