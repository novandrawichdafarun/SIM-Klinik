import { getInvoiceHarianAction } from "@/actions/invoice";
import ErrorBox from "../ui/ErrorBox";
import InvoiceHarianView from "./InvoiceHarianView";

export default async function InvoiceDigitalContent({
  searchParams,
}: Pick<PageProps<"/invoice-digital">, "searchParams">) {
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const q = str("q");
  const res = await getInvoiceHarianAction({ tanggal: str("tanggal"), q });
  if (!res.success || !res.data) {
    return (
      <ErrorBox message={res.success ? "Data tidak tersedia." : res.error} />
    );
  }
  return <InvoiceHarianView key={res.data.tanggal} data={res.data} q={q} />;
}
