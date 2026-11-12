import { requirePermissionPage } from "@/libs/authz";
import { getPoliListService } from "@/services/karyawan.service";
import LayananForm from "./LayananForm";
import ErrorBox from "../ui/ErrorBox";

export default async function TambahLayananForm() {
  await requirePermissionPage("katalog_layanan", "tambah");
  const result = await getPoliListService();

  return result.success ? (
    <LayananForm poli={result.data ?? []} />
  ) : (
    <ErrorBox message={result.error} />
  );
}
