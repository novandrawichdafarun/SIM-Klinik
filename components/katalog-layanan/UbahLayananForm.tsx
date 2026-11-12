import { getLayananByIdAction } from "@/actions/layanan";
import { requirePermissionPage } from "@/libs/authz";
import { getPoliListService } from "@/services/karyawan.service";
import { notFound } from "next/navigation";
import ErrorBox from "../ui/ErrorBox";
import Breadcrumb from "../ui/Breadcrumb";
import LayananForm from "./LayananForm";

export default async function UbahLayananForm({
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
