import { notFound } from "next/navigation";
import { getLayananByIdAction } from "@/actions/layanan";
import { requireSuperAdminPage } from "@/libs/authz";
import { getPoliListService } from "@/services/karyawan.service";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import LayananForm from "@/components/katalog-layanan/LayananForm";
export default async function Page({
  params,
}: PageProps<"/katalog-layanan/[id]/ubah">) {
  await requireSuperAdminPage();
  const { id } = await params;
  const service = await getLayananByIdAction(Number(id));
  if (!service.success || !service.data) notFound();
  const [poli] = await Promise.all([getPoliListService()]);
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Katalog Layanan", href: "/katalog-layanan" },
            { label: "Ubah Layanan" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold">Ubah Layanan</h1>
        {poli.success && (
          <LayananForm initial={service.data} poli={poli.data ?? []} />
        )}
      </main>
    </AppShell>
  );
}
