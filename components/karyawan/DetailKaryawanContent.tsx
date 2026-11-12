import { getKaryawanDetailAction } from "@/actions/karyawan";
import { notFound } from "next/navigation";
import Breadcrumb from "../ui/Breadcrumb";
import ErrorBox from "../ui/ErrorBox";
import KaryawanDetailView from "./KaryawanDetailView";

type Props = PageProps<"/karyawan/[id]">;

export default async function DetailKaryawanContent({
  params,
  searchParams,
}: Pick<Props, "params" | "searchParams">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const idKaryawan = Number(id);
  if (!Number.isInteger(idKaryawan) || idKaryawan <= 0) notFound();

  const periode =
    typeof sp.periode === "string" ? Number(sp.periode) : undefined;
  const result = await getKaryawanDetailAction(idKaryawan, periode);

  if (!result.success || !result.data) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Kelola Karyawan", href: "/karyawan" },
            { label: "Detail" },
          ]}
        />
        <ErrorBox
          message={result.success ? "Data tidak tersedia." : result.error}
        />
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/dashboard" },
          { label: "Kelola Karyawan", href: "/karyawan" },
          { label: result.data.karyawan.namaLengkap },
        ]}
      />
      <KaryawanDetailView data={result.data} />
    </>
  );
}
