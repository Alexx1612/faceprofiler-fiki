import { NeumorphEyebrow } from "@/components/ui/neumorph-eyebrow";
import { cn } from "@/lib/utils";

/** One page section: eyebrow badge, title, a one-sentence lead, then the content. */
export function Section({
  id,
  eyebrow,
  title,
  lead,
  className,
  level = 2,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: React.ReactNode;
  className?: string;
  /** 1 on a sub-page whose first section names the page; 2 everywhere else. */
  level?: 1 | 2;
  children: React.ReactNode;
}) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <section id={id} className={cn("relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8", className)}>
      <div className="mb-4 max-w-4xl">
        <NeumorphEyebrow intent="night">{eyebrow}</NeumorphEyebrow>
        <H className="font-heading mt-1 mb-2 text-xl font-semibold tracking-tight text-balance text-neutral-100 sm:text-2xl lg:text-3xl">{title}</H>
        {lead && <p className="text-muted-foreground text-sm leading-relaxed">{lead}</p>}
      </div>
      {children}
    </section>
  );
}
