import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import TarifJasaContent from "@/components/tarif-jasa/TarifJasaContent";

export const metadata = { title: "Tarif Jasa Pelayanan - ERM Klinik Pratama" };

export default function TarifJasaPage() {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Tarif Jasa Pelayanan" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
          Tarif Jasa Pelayanan
        </h1>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />
          }
        >
          <TarifJasaContent />
        </Suspense>
      </main>
    </AppShell>
  );
}
