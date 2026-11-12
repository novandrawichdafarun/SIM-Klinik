import { getKaryawanFormDataAction } from "@/actions/karyawan";
import { notFound } from "next/navigation";
import ErrorBox from "../ui/ErrorBox";
import Breadcrumb from "../ui/Breadcrumb";
import KaryawanForm from "./KaryawanForm";

export default async function UbahKaryawanForm({
  params,
}: Pick<PageProps<"/karyawan/[id]/ubah">, "params">) {
  const { id } = await params;
  const idKaryawan = Number(id);
  if (!Number.isInteger(idKaryawan) || idKaryawan <= 0) notFound();

  const result = await getKaryawanFormDataAction(idKaryawan);
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }

  const { poli, values } = result.data;
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/dashboard" },
          { label: "Kelola Karyawan", href: "/karyawan" },
          {
            label: values?.namaLengkap ?? "Karyawan",
            href: `/karyawan/${idKaryawan}`,
          },
          { label: "Ubah Data" },
        ]}
      />
      <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
        Ubah Data Karyawan
      </h1>
      <KaryawanForm poli={poli} initialValues={values} />
    </>
  );
}
