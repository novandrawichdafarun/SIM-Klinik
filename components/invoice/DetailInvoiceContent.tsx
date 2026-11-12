import { getInvoiceDetailAction } from "@/actions/invoice";
import ErrorBox from "../ui/ErrorBox";
import Breadcrumb from "../ui/Breadcrumb";
import InvoiceKertas from "./InvoiceKertas";
import KirimInvoicePanel from "./KirimInvoicePanel";
import { notFound } from "next/navigation";

export default async function DetailInvoiceContent({
  params,
}: Pick<PageProps<"/invoice-digital/[id]">, "params">) {
  const { id } = await params;
  const idInvoice = Number(id);
  if (!Number.isInteger(idInvoice) || idInvoice <= 0) notFound();

  const res = await getInvoiceDetailAction(idInvoice);
  if (!res.success || !res.data) {
    return (
      <ErrorBox
        message={res.success ? "Invoice tidak ditemukan." : res.error}
      />
    );
  }
  const { invoice, bisaKirim } = res.data;
  return (
    <>
      <Breadcrumb
        items={[
          {
            label: "Invoice Digital",
            href: `/invoice-digital?tanggal=${invoice.tglKunjungan}`,
          },
          { label: invoice.nomorInvoice },
        ]}
      />
      <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
        {invoice.nomorInvoice}
      </h1>
      <div className="grid gap-5 xl:grid-cols-[1fr_minmax(320px,380px)]">
        <InvoiceKertas invoice={invoice} />
        <KirimInvoicePanel invoice={invoice} bisaKirim={bisaKirim} />
      </div>
    </>
  );
}
