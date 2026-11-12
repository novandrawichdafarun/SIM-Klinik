import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import RekapPasienContent from "@/components/rekap-pasien/RekapPasienContent";

export const metadata = { title: "Rekap Data Pasien - ERM Klinik Pratama" };

export default function RekapPasienPage({
  searchParams,
}: PageProps<"/rekap-pasien">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Rekap Data Pasien" },
          ]}
        />
        <h1 className="mb-5 text-[25px] font-bold tracking-tight md:text-[28px]">
          Rekap Data Pasien
        </h1>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />
          }
        >
          <RekapPasienContent searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
