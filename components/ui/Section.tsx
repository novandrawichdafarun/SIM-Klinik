export default function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-[15px] font-bold">{title}</h2>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">{children}</dl>
    </section>
  );
}
