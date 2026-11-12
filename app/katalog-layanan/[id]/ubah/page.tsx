import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getLayananByIdAction } from "@/actions/layanan";
import { requirePermissionPage } from "@/libs/authz";
import { getPoliListService } from "@/services/karyawan.service";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";
import LayananForm from "@/components/katalog-layanan/LayananForm";

export default function Page({ params }: PageProps<"/katalog-layanan/[id]/ubah">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
          <UbahLayananForm params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}

async function UbahLayananForm({
  params,
}: {
  params: PageProps<"/katalog-layanan/[id]/ubah">["params"];
}) {
  await requirePermissionPage("katalog_layanan", "ubah");
  const { id } = await params;
  const service = await getLayananByIdAction(Number(id));
  if (!service.success || !service.data) notFound();
  const poli = await getPoliListService();
  if (!poli.success) return <ErrorBox message={poli.error} />;
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/dashboard" },
          { label: "Katalog Layanan", href: "/katalog-layanan" },
          { label: "Ubah Layanan" },
        ]}
      />
      <h1 className="mb-6 text-[25px] font-bold">Ubah Layanan</h1>
      <LayananForm initial={service.data} poli={poli.data ?? []} />
    </>
  );
}
