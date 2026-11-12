import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import PeriksaContent from "@/components/rekap-pasien/PeriksaContent";

export const metadata = {
  title: "Pemeriksaan & Diagnosa - ERM Klinik Pratama",
};

export default function PeriksaPage({
  params,
  searchParams,
}: PageProps<"/rekap-pasien/kunjungan/[id]/periksa">) {
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-4.5 md:px-6 md:py-6">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          }
        >
          <PeriksaContent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
