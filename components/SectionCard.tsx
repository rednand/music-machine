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
    <section
      id={id}
      className="mb-8 overflow-hidden rounded-xl border border-white/90 bg-white/50 p-8 backdrop-blur-xl"
      style={{ boxShadow: "0 34px 60px -44px rgba(23,20,32,0.35)" }}
    >
      <h2 className="mb-5 font-heading text-2xl font-extrabold text-[#120f18]">{title}</h2>
      {children}
    </section>
  );
}
