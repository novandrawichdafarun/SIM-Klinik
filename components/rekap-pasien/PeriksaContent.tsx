import { getPemeriksaanAction } from "@/actions/rekap-pasien";
import { notFound } from "next/navigation";
import ErrorBox from "../ui/ErrorBox";
import Breadcrumb from "../ui/Breadcrumb";
import PemeriksaanForm from "./PemeriksaanForm";

export default async function PeriksaContent({
  params,
  searchParams,
}: Pick<
  PageProps<"/rekap-pasien/kunjungan/[id]/periksa">,
  "params" | "searchParams"
>) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const idKunjungan = Number(id);
  if (!Number.isInteger(idKunjungan) || idKunjungan <= 0) notFound();

  const res = await getPemeriksaanAction(idKunjungan);
  if (!res.success || !res.data) {
    return (
      <ErrorBox
        message={res.success ? "Kunjungan tidak ditemukan." : res.error}
      />
    );
  }
  const k = res.data.kunjungan;
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Rekap Data Pasien", href: "/rekap-pasien" },
          { label: k.namaPasien, href: `/rekap-pasien/pasien/${k.idPasien}` },
          { label: "Pemeriksaan" },
        ]}
      />
      <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
        Pemeriksaan &amp; Diagnosa
      </h1>
      <PemeriksaanForm
        {...res.data}
        tabAwal={sp.tab === "diagnosa" ? "diagnosa" : "pemeriksaan"}
      />
    </>
  );
}
