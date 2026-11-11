import { Suspense } from "react";
import { requireSuperAdminPage } from "@/libs/authz";
import { getPoliListService } from "@/services/karyawan.service";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";
import LayananForm from "@/components/katalog-layanan/LayananForm";

export default function Page() {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Katalog Layanan", href: "/katalog-layanan" },
            { label: "Tambah Layanan" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold">Tambah Layanan</h1>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          }
        >
          <TambahLayananForm />
        </Suspense>
      </main>
    </AppShell>
  );
}

async function TambahLayananForm() {
  await requireSuperAdminPage();
  const result = await getPoliListService();

  return result.success ? (
    <LayananForm poli={result.data ?? []} />
  ) : (
    <ErrorBox message={result.error} />
  );
}
