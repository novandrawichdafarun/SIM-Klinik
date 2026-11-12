import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPasienDetailAction } from "@/actions/rekap-pasien";
import AppShell from "@/components/layouts/AppShell";
import PasienDetailView from "@/components/rekap-pasien/PasienDetailView";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Detail Pasien - ERM Klinik Pratama" };

async function DetailContent({ params }: Pick<PageProps<"/rekap-pasien/pasien/[id]">, "params">) {
  const { id } = await params;
  const idPasien = Number(id);
  if (!Number.isInteger(idPasien) || idPasien <= 0) notFound();

  const res = await getPasienDetailAction(idPasien);
  if (!res.success || !res.data) {
    return <ErrorBox message={res.success ? "Pasien tidak ditemukan." : res.error} />;
  }
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Rekap Data Pasien", href: "/rekap-pasien" },
          { label: res.data.pasien.namaLengkap },
        ]}
      />
      <PasienDetailView key={res.data.pasien.idPasien} {...res.data} />
    </>
  );
}

export default function PasienDetailPage({ params }: PageProps<"/rekap-pasien/pasien/[id]">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />}>
          <DetailContent params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
