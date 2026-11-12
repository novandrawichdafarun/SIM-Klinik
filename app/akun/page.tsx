import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import AkunList from "@/components/akun/AkunList";

export const metadata = { title: "Kelola Akun - ERM Klinik Pratama" };

export default function AkunPage({ searchParams }: PageProps<"/akun">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Kelola Akun" },
          ]}
        />
        <h1 className="text-[25px] font-bold tracking-tight md:text-[28px]">
          Kelola Akun Karyawan
        </h1>
        <p className="mt-1 mb-6 text-sm text-ink-3">
          Akun login untuk karyawan yang sudah terdaftar. Role akun: Super
          Admin, Admin, atau Dokter.
        </p>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />
          }
        >
          <AkunList searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
