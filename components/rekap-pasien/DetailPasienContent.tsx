import { getPasienDetailAction } from "@/actions/rekap-pasien";
import { notFound } from "next/navigation";
import ErrorBox from "../ui/ErrorBox";
import Breadcrumb from "../ui/Breadcrumb";
import PasienDetailView from "./PasienDetailView";

export default async function DetailPasienContent({
  params,
}: Pick<PageProps<"/rekap-pasien/pasien/[id]">, "params">) {
  const { id } = await params;
  const idPasien = Number(id);
  if (!Number.isInteger(idPasien) || idPasien <= 0) notFound();

  const res = await getPasienDetailAction(idPasien);
  if (!res.success || !res.data) {
    return (
      <ErrorBox message={res.success ? "Pasien tidak ditemukan." : res.error} />
    );
  }
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Rekap Data Pasien", href: "/rekap-pasien" },
          { label: res.data.pasien.namaLengkap },
        ]}
      />
      <PasienDetailView key={res.data.pasien.idPasien} {...res.data} />
    </>
  );
}
