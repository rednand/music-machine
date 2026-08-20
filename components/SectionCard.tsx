export function SectionCard({
  id,
  number,
  title,
  children
}: {
  id?: string;
  number?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16">
      <div className="mb-5 flex items-baseline gap-4">
        {number && <span className="font-serif text-3xl font-bold text-[#171420]/15">{number}</span>}
        <h2 className="font-heading text-2xl font-extrabold text-[#120f18]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
