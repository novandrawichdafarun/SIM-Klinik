import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import TambahKunjunganForm from "@/components/rekap-pasien/TambahKunjunganForm";

export const metadata = { title: "Daftarkan Kunjungan - ERM Klinik Pratama" };

export default function TambahKunjunganPage({
  searchParams,
}: PageProps<"/rekap-pasien/kunjungan/tambah">) {
  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Rekap Data Pasien", href: "/rekap-pasien" },
            { label: "Daftarkan Kunjungan" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
          Daftarkan Kunjungan
        </h1>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          }
        >
          <TambahKunjunganForm searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
