import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import KatalogLayananData from "@/components/katalog-layanan/KatalogLayananData";

export const metadata = { title: "Katalog Layanan - ERM Klinik Pratama" };

export default async function Page({
  searchParams,
}: PageProps<"/katalog-layanan">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Katalog Layanan" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight">
          Katalog Layanan
        </h1>
        <Suspense fallback={<p>Memuat katalog layanan...</p>}>
          <KatalogLayananData searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
