import { getHakAksesPageAction } from "@/actions/hak-akses";
import ErrorBox from "../ui/ErrorBox";
import HakAksesView from "./HakAksesView";

export default async function HakAksesContent({
  searchParams,
}: Pick<PageProps<"/hak-akses">, "searchParams">) {
  const sp = await searchParams;
  const user = typeof sp.user === "string" ? sp.user : undefined;

  const result = await getHakAksesPageAction(user);
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }
  return <HakAksesView {...result.data} />;
}
