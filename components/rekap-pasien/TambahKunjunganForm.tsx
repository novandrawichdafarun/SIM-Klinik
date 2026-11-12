import { getKunjunganFormAction } from "@/actions/rekap-pasien";
import { hariIni } from "@/utils/date";
import ErrorBox from "../ui/ErrorBox";
import KunjunganForm from "./KunjunganForm";

export default async function TambahKunjunganForm({
  searchParams,
}: Pick<PageProps<"/rekap-pasien/kunjungan/tambah">, "searchParams">) {
  const sp = await searchParams;
  const tanggal =
    typeof sp.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.tanggal)
      ? sp.tanggal
      : hariIni();
  const pasien = typeof sp.pasien === "string" ? Number(sp.pasien) : undefined;

  const res = await getKunjunganFormAction();
  if (!res.success || !res.data) {
    return (
      <ErrorBox message={res.success ? "Data tidak tersedia." : res.error} />
    );
  }
  return (
    <KunjunganForm
      {...res.data}
      defaultPasien={pasien}
      defaultTanggal={tanggal}
    />
  );
}
