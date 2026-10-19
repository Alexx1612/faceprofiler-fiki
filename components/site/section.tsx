import { GradientHeading } from "@/components/ui/gradient-heading";
import { NeumorphEyebrow } from "@/components/ui/neumorph-eyebrow";
import { cn } from "@/lib/utils";

/** One page section: eyebrow badge, gradient title, a one-sentence lead, then the content. */
export function Section({
  id,
  eyebrow,
  title,
  lead,
  className,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24", className)}>
      <div className="mb-10 max-w-3xl sm:mb-14">
        <NeumorphEyebrow intent="night">{eyebrow}</NeumorphEyebrow>
        <GradientHeading size="lg" weight="semi" variant="default" className="mt-3">
          {title}
        </GradientHeading>
        {lead && <p className="text-muted-foreground mt-1 text-base leading-relaxed sm:text-lg">{lead}</p>}
      </div>
      {children}
    </section>
  );
}
