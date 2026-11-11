import { Suspense } from "react";
import { getTarifJasaPageAction } from "@/actions/tarif-jasa";
import AppShell from "@/components/layouts/AppShell";
import TarifJasaView from "@/components/tarif-jasa/TarifJasaView";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";
import { requireSuperAdminPage } from "@/libs/authz";

export const metadata = { title: "Tarif Jasa Pelayanan - ERM Klinik Pratama" };

async function TarifJasaContent() {
  await requireSuperAdminPage();
  const result = await getTarifJasaPageAction();
  if (!result.success || !result.data) {
    return <ErrorBox message={result.success ? "Data tidak tersedia." : result.error} />;
  }
  return <TarifJasaView {...result.data} />;
}

export default function TarifJasaPage() {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[{ label: "Beranda", href: "/dashboard" }, { label: "Tarif Jasa Pelayanan" }]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
          Tarif Jasa Pelayanan
        </h1>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />}>
          <TarifJasaContent />
        </Suspense>
      </main>
    </AppShell>
  );
}
