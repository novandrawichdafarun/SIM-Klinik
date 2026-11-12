import { Suspense } from "react";
import PublikShell from "@/components/invoice/PublikShell";
import RatingContent from "@/components/invoice/RatingContent";

export const metadata = {
  title: "Beri Rating - Klinik Pratama Unusa",
  robots: { index: false },
};

export default function RatingPage({ params }: PageProps<"/rating/[token]">) {
  return (
    <PublikShell>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}
      >
        <RatingContent params={params} />
      </Suspense>
    </PublikShell>
  );
}
