import { getPasienFormAction } from "@/actions/rekap-pasien";
import ErrorBox from "../ui/ErrorBox";
import PasienForm from "./PasienForm";

export default async function TambahPasienForm() {
  const res = await getPasienFormAction();
  if (!res.success) return <ErrorBox message={res.error} />;
  return <PasienForm pasien={null} />;
}
