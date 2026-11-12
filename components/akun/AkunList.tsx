import { getAkunListAction } from "@/actions/akun";
import { StatusAkunFilter } from "@/types/akun";
import ErrorBox from "../ui/ErrorBox";
import AkunTabel from "./AkunTabel";

export default async function AkunList({
  searchParams,
}: Pick<PageProps<"/akun">, "searchParams">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status: StatusAkunFilter =
    sp.status === "aktif" || sp.status === "nonaktif" ? sp.status : "semua";

  const result = await getAkunListAction({ q, status });
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data akun tidak tersedia." : result.error}
      />
    );
  }
  return (
    <AkunTabel
      items={result.data.items}
      currentUserId={result.data.currentUserId}
      q={q}
      status={status}
    />
  );
}