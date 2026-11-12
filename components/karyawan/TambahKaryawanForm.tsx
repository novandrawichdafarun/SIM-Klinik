import { getKaryawanFormDataAction } from "@/actions/karyawan";
import ErrorBox from "../ui/ErrorBox";
import KaryawanForm from "./KaryawanForm";

export default async function TambahKaryawanForm() {
  const result = await getKaryawanFormDataAction();
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }
  return <KaryawanForm poli={result.data.poli} initialValues={null} />;
}
