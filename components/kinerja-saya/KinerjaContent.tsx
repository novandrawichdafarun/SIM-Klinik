import { getKinerjaSayaAction } from "@/actions/kinerja";
import ErrorBox from "../ui/ErrorBox";
import KinerjaSayaView from "./KinerjaSayaView";

export default async function KinerjaContent({
  searchParams,
}: Pick<PageProps<"/kinerja-saya">, "searchParams">) {
  const sp = await searchParams;
  const periode =
    typeof sp.periode === "string" ? Number(sp.periode) : undefined;
  const result = await getKinerjaSayaAction(periode);
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }
  return <KinerjaSayaView data={result.data} />;
}
