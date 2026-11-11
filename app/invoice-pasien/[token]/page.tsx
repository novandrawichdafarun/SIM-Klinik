import { Suspense } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { getInvoicePublikAction } from "@/actions/invoice";
import InvoiceKertas from "@/components/invoice/InvoiceKertas";
import PublikShell from "@/components/invoice/PublikShell";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Invoice - Klinik Pratama Unusa", robots: { index: false } };

async function Konten({ params }: Pick<PageProps<"/invoice-pasien/[token]">, "params">) {
  const { token } = await params;
  const res = await getInvoicePublikAction(token);
  if (!res.success || !res.data) {
    return <ErrorBox message={res.success ? "Invoice tidak ditemukan." : res.error} />;
  }
  const i = res.data;
  return (
    <div className="space-y-5">
      <InvoiceKertas invoice={i} />
      <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">
            {i.rating ? "Terima kasih atas penilaian Anda!" : "Bagaimana pelayanan kami?"}
          </p>
          <p className="text-sm text-ink-3">
            {i.rating
              ? "Penilaian Anda membantu kami meningkatkan pelayanan."
              : "Beri rating untuk dokter, perawat, dan klinik. Hanya butuh 1 menit."}
          </p>
        </div>
        {!i.rating && (
          <Link
            href={`/rating/${token}`}
            className="flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
          >
            <Star aria-hidden="true" size={16} /> Beri Rating
          </Link>
        )}
      </section>
    </div>
  );
}

export default function InvoicePasienPage({ params }: PageProps<"/invoice-pasien/[token]">) {
  return (
    <PublikShell>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
        <Konten params={params} />
      </Suspense>
    </PublikShell>
  );
}
