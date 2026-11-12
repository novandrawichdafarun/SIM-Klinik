import { getLayananListAction } from "@/actions/layanan";
import KatalogLayananView from "./KatalogLayananView";
import ErrorBox from "../ui/ErrorBox";

export default async function KatalogLayananData({
  searchParams,
}: {
  searchParams: PageProps<"/katalog-layanan">["searchParams"];
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const poli = typeof sp.poli === "string" ? sp.poli : "Semua";
  const discount = sp.discount === "1";
  const r = await getLayananListAction({ q, poli, discount });

  return r.success ? (
    <KatalogLayananView
      items={r.data ?? []}
      q={q}
      poli={poli}
      discount={discount}
    />
  ) : (
    <ErrorBox message={r.error} />
  );
}
