import { Suspense } from "react";
import { getLayananListAction } from "@/actions/layanan";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";
import KatalogLayananView from "@/components/katalog-layanan/KatalogLayananView";

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

async function KatalogLayananData({
  searchParams,
}: {
  searchParams: PageProps<"/katalog-layanan">["searchParams"];
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const poli = typeof sp.poli === "string" ? sp.poli : "Semua";
  const discount = sp.discount === "1";
  const r = await getLayananListAction({ q, poli, discount });

  return r.success ? (
    <KatalogLayananView
      items={r.data ?? []}
      q={q}
      poli={poli}
      discount={discount}
    />
  ) : (
    <ErrorBox message={r.error} />
  );
}
