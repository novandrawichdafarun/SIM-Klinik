import { Suspense } from "react";
import { getJasaPelayananAction } from "@/actions/jasa-pelayanan";
import JasaPelayananView from "@/components/jasa-pelayanan/JasaPelayananView";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Jasa Pelayanan Saya - ERM Klinik Pratama" };

async function JasaPelayananContent({
  searchParams,
}: Pick<PageProps<"/jasa-pelayanan">, "searchParams">) {
  const sp = await searchParams;
  const bulan = typeof sp.bulan === "string" ? sp.bulan : undefined;

  const result = await getJasaPelayananAction(bulan);
  if (!result.success || !result.data) {
    return <ErrorBox message={result.success ? "Data tidak tersedia." : result.error} />;
  }
  // key: reset pilihan & filter ketika bulan berganti
  return <JasaPelayananView key={result.data.bulan} {...result.data} />;
}

export default function JasaPelayananPage({ searchParams }: PageProps<"/jasa-pelayanan">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[{ label: "Beranda", href: "/dashboard" }, { label: "Jasa Pelayanan Saya" }]}
        />
        <h1 className="text-[25px] font-bold tracking-tight md:text-[28px]">Jasa Pelayanan Saya</h1>
        <p className="mt-1 mb-6 text-sm text-ink-3">
          Rincian perolehan jasa pelayanan pribadi dari tindakan medis yang Anda tangani.
        </p>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />}>
          <JasaPelayananContent searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
