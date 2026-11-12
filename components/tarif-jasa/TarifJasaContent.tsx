import { getTarifJasaPageAction } from "@/actions/tarif-jasa";
import { requireSuperAdminPage } from "@/libs/authz";
import ErrorBox from "../ui/ErrorBox";
import TarifJasaView from "./TarifJasaView";

export default async function TarifJasaContent() {
  await requireSuperAdminPage();
  const result = await getTarifJasaPageAction();
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }
  return <TarifJasaView {...result.data} />;
}
