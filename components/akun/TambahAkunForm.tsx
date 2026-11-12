import { Link } from "lucide-react";
import AkunForm from "./AkunForm";
import ErrorBox from "../ui/ErrorBox";
import { getKaryawanTanpaAkunAction } from "@/actions/akun";
import { getFiturListAction } from "@/actions/hak-akses";

export default async function TambahAkunForm({
  searchParams,
}: Pick<PageProps<"/akun/tambah">, "searchParams">) {
  const sp = await searchParams;
  const defaultKaryawanId =
    typeof sp.karyawan === "string" ? Number(sp.karyawan) : undefined;

  const [result, fitur] = await Promise.all([
    getKaryawanTanpaAkunAction(),
    getFiturListAction(),
  ]);
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }

  if (result.data.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-sm shadow-sm">
        <p>Semua karyawan aktif sudah memiliki akun.</p>
        <Link
          href="/karyawan/tambah"
          className="mt-3 inline-flex font-semibold text-accent-ink hover:underline"
        >
          Tambah karyawan baru terlebih dahulu →
        </Link>
      </div>
    );
  }

  return (
    <AkunForm
      mode="create"
      karyawanOptions={result.data}
      defaultKaryawanId={defaultKaryawanId}
      fitur={fitur.success ? (fitur.data ?? []) : []}
    />
  );
}
