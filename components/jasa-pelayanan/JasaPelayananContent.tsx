import { getJasaPelayananAction } from "@/actions/jasa-pelayanan";
import ErrorBox from "../ui/ErrorBox";
import JasaPelayananView from "./JasaPelayananView";

export default async function JasaPelayananContent({
  searchParams,
}: Pick<PageProps<"/jasa-pelayanan">, "searchParams">) {
  const sp = await searchParams;
  const bulan = typeof sp.bulan === "string" ? sp.bulan : undefined;

  const result = await getJasaPelayananAction(bulan);
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }
  // key: reset pilihan & filter ketika bulan berganti
  return <JasaPelayananView key={result.data.bulan} {...result.data} />;
}
