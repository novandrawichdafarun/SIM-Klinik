import { Suspense } from "react";
import { getPasienFormAction } from "@/actions/rekap-pasien";
import AppShell from "@/components/layouts/AppShell";
import PasienForm from "@/components/rekap-pasien/PasienForm";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Tambah Pasien - ERM Klinik Pratama" };

async function Konten() {
  const res = await getPasienFormAction();
  if (!res.success) return <ErrorBox message={res.error} />;
  return <PasienForm pasien={null} />;
}

export default function TambahPasienPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[{ label: "Rekap Data Pasien", href: "/rekap-pasien?tab=semua" }, { label: "Tambah Pasien" }]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">Tambah Pasien</h1>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
          <Konten />
        </Suspense>
      </main>
    </AppShell>
  );
}
