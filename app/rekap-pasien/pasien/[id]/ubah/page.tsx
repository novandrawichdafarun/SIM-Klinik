import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPasienFormAction } from "@/actions/rekap-pasien";
import AppShell from "@/components/layouts/AppShell";
import PasienForm from "@/components/rekap-pasien/PasienForm";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Ubah Data Pasien - ERM Klinik Pratama" };

async function Konten({ params }: Pick<PageProps<"/rekap-pasien/pasien/[id]/ubah">, "params">) {
  const { id } = await params;
  const idPasien = Number(id);
  if (!Number.isInteger(idPasien) || idPasien <= 0) notFound();
  const res = await getPasienFormAction(idPasien);
  if (!res.success || !res.data) {
    return <ErrorBox message={res.success ? "Pasien tidak ditemukan." : res.error} />;
  }
  return <PasienForm pasien={res.data} />;
}

export default function UbahPasienPage({ params }: PageProps<"/rekap-pasien/pasien/[id]/ubah">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
          <Konten params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
