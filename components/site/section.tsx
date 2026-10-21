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
    <section id={id} className={cn("relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8", className)}>
      <div className="mb-4 max-w-4xl">
        <NeumorphEyebrow intent="night">{eyebrow}</NeumorphEyebrow>
        <GradientHeading size="sm" weight="semi" variant="default" className="mt-1">
          {title}
        </GradientHeading>
        {lead && <p className="text-muted-foreground -mt-2 text-sm leading-relaxed">{lead}</p>}
      </div>
      {children}
    </section>
  );
}
