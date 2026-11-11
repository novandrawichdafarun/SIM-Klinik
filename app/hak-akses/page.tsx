import { Suspense } from "react";
import { getHakAksesPageAction } from "@/actions/hak-akses";
import HakAksesView from "@/components/hak-akses/HakAksesView";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Hak Akses Karyawan - ERM Klinik Pratama" };

async function HakAksesContent({
  searchParams,
}: Pick<PageProps<"/hak-akses">, "searchParams">) {
  const sp = await searchParams;
  const user = typeof sp.user === "string" ? sp.user : undefined;

  const result = await getHakAksesPageAction(user);
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }
  return <HakAksesView {...result.data} />;
}

export default function HakAksesPage({
  searchParams,
}: PageProps<"/hak-akses">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Pengaturan" },
            { label: "Hak Akses Karyawan" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
          Kelola Hak Akses Karyawan
        </h1>
        <Suspense
          fallback={
            <div className="h-150 animate-pulse rounded-xl bg-surface shadow-sm" />
          }
        >
          <HakAksesContent searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
