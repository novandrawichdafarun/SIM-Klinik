import { getPasienFormAction } from "@/actions/rekap-pasien";
import { notFound } from "next/navigation";
import ErrorBox from "../ui/ErrorBox";
import PasienForm from "./PasienForm";

export default async function UbahPasienForm({
  params,
}: Pick<PageProps<"/rekap-pasien/pasien/[id]/ubah">, "params">) {
  const { id } = await params;
  const idPasien = Number(id);
  if (!Number.isInteger(idPasien) || idPasien <= 0) notFound();
  const res = await getPasienFormAction(idPasien);
  if (!res.success || !res.data) {
    return (
      <ErrorBox message={res.success ? "Pasien tidak ditemukan." : res.error} />
    );
  }
  return <PasienForm pasien={res.data} />;
}
