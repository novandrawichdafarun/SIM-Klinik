import { Suspense } from "react";
import PublikShell from "@/components/invoice/PublikShell";
import InvoicePasienContent from "@/components/invoice/InvoicePasienContent";

export const metadata = {
  title: "Invoice - Klinik Pratama Unusa",
  robots: { index: false },
};

export default function InvoicePasienPage({
  params,
}: PageProps<"/invoice-pasien/[token]">) {
  return (
    <PublikShell>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}
      >
        <InvoicePasienContent params={params} />
      </Suspense>
    </PublikShell>
  );
}
