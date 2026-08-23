export function SectionCard({
  id,
  title,
  children
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16">
      <div className="mb-5">
        <h2 className="font-heading text-2xl font-extrabold text-[#120f18]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
