import { TriangleAlert } from "lucide-react";

export default function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-danger-soft p-4 text-sm text-danger-ink"
    >
      <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
