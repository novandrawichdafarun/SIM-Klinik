import {
  getAksesRekapAction,
  getDaftarPasienAction,
  getKunjunganHariIniAction,
} from "@/actions/rekap-pasien";
import ErrorBox from "../ui/ErrorBox";
import AntreanDiagnosaView from "./AntreanDiagnosaView";
import KunjunganView from "./KunjunganView";
import PasienListView from "./PasienListView";
import { TabLink } from "./RekapToolbar";

type Tab = "kunjungan" | "saya" | "semua";

export default async function RekapPasienContent({
  searchParams,
}: Pick<PageProps<"/rekap-pasien">, "searchParams">) {
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const q = str("q");

  // Hak akses menentukan tab yang tampil; dokter hanya mendapat "Pasien Saya"
  const hak = await getAksesRekapAction();
  if (!hak.success || !hak.data) {
    return (
      <ErrorBox message={!hak.success ? hak.error : "Data tidak tersedia."} />
    );
  }
  const minta = str("tab");
  let tab: Tab =
    minta === "saya" ? "saya" : minta === "semua" ? "semua" : "kunjungan";
  if (tab === "kunjungan" && !hak.data.bisaLihatKunjungan) tab = "saya";
  if (tab === "semua" && !hak.data.bisaLihatSemuaPasien) tab = "saya";
  const hanyaSatuTab =
    !hak.data.bisaLihatKunjungan && !hak.data.bisaLihatSemuaPasien;

  const kunjungan =
    tab === "kunjungan"
      ? await getKunjunganHariIniAction({ tanggal: str("tanggal"), q })
      : null;
  const pasien =
    tab !== "kunjungan"
      ? await getDaftarPasienAction({ q, semua: tab === "semua" })
      : null;

  const result = kunjungan ?? pasien;
  if (!result || !result.success || !result.data) {
    return (
      <ErrorBox
        message={
          result && !result.success ? result.error : "Data tidak tersedia."
        }
      />
    );
  }
  const akses = result.data.akses;

  return (
    <>
      <div role="tablist" className="mb-5 flex gap-6 border-b border-line">
        {akses.bisaLihatKunjungan && (
          <TabLink href="/rekap-pasien" active={tab === "kunjungan"}>
            Kunjungan Hari Ini
          </TabLink>
        )}
        <TabLink
          href="/rekap-pasien?tab=saya"
          active={tab === "saya" || hanyaSatuTab}
        >
          Pasien Saya
        </TabLink>
        {akses.bisaLihatSemuaPasien && (
          <TabLink href="/rekap-pasien?tab=semua" active={tab === "semua"}>
            Semua Pasien
          </TabLink>
        )}
      </div>

      {kunjungan?.success && kunjungan.data && (
        <KunjunganView
          key={kunjungan.data.tanggal}
          tanggal={kunjungan.data.tanggal}
          items={kunjungan.data.items}
          q={q}
          akses={akses}
        />
      )}
      {pasien?.success && pasien.data?.antrean && (
        <AntreanDiagnosaView items={pasien.data.antrean} q={q} />
      )}
      {pasien?.success && pasien.data && (
        <PasienListView
          items={pasien.data.items}
          q={q}
          akses={akses}
          mode={tab === "semua" ? "semua" : "saya"}
        />
      )}
    </>
  );
}
