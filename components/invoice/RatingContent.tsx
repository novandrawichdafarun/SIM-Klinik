import { getInvoicePublikAction } from "@/actions/invoice";
import ErrorBox from "../ui/ErrorBox";
import { formatTanggal } from "@/utils/format";
import { CircleCheck } from "lucide-react";
import { NAMA_KLINIK } from "@/libs/klinik";
import Bintang from "./Bintang";
import RatingForm from "./RatingForm";

export default async function RatingContent({
  params,
}: Pick<PageProps<"/rating/[token]">, "params">) {
  const { token } = await params;
  const res = await getInvoicePublikAction(token);
  if (!res.success || !res.data) {
    return (
      <ErrorBox message={res.success ? "Tautan tidak valid." : res.error} />
    );
  }
  const i = res.data;

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">
        Bagaimana pelayanan kami?
      </h1>
      <p className="mt-1 mb-5 text-sm text-ink-3">
        Kunjungan {i.namaPasien} ke {i.namaPoli} pada{" "}
        {formatTanggal(i.tglKunjungan)}. Beri bintang 1–5 untuk setiap
        penilaian.
      </p>

      {i.rating ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
          <CircleCheck
            aria-hidden="true"
            size={40}
            className="text-emerald-500"
          />
          <h2 className="text-lg font-bold">Penilaian sudah dikirim</h2>
          <p className="text-sm text-ink-3">
            Terima kasih telah menilai pelayanan {NAMA_KLINIK}.
          </p>
          <dl className="mt-2 w-full max-w-xs space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt>Dokter</dt>
              <dd>
                <Bintang nilai={i.rating.nilaiDokter} />
              </dd>
            </div>
            {i.rating.nilaiPerawat !== null && (
              <div className="flex items-center justify-between">
                <dt>Perawat</dt>
                <dd>
                  <Bintang nilai={i.rating.nilaiPerawat} />
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between">
              <dt>Klinik</dt>
              <dd>
                <Bintang nilai={i.rating.nilaiKlinik} />
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <RatingForm
          token={token}
          namaDokter={i.namaDokter}
          namaPerawat={i.namaPerawat}
        />
      )}
    </>
  );
}
