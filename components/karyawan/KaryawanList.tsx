import { getKaryawanListAction } from "@/actions/karyawan";
import ErrorBox from "@/components/ui/ErrorBox";
import KaryawanTabel from "./KaryawanTabel";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Server component: baca q & page dari URL, ambil data, lalu serahkan ke tabel (client). */
export default async function KaryawanList({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = typeof sp.page === "string" ? Number(sp.page) : 1;

  const result = await getKaryawanListAction({ q, page });

  if (!result.success || !result.data) {
    return (
      <ErrorBox message={result.success ? "Data karyawan tidak tersedia." : result.error} />
    );
  }

  return <KaryawanTabel {...result.data} q={q} />;
}
