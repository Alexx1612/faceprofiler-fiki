/**
 * Screen map of the console as a state diagram (diagram-design "State machine" grammar, site skin).
 *
 * Methodology: screens are nodes, arrows are labelled with the button that causes the move. The night
 * alert path (phone or Live, into Alert) is the one focal colour. The sidebar reaches every screen, so it
 * is one note under the diagram instead of an arrow from every node (the skill's "from any state" rule).
 * Coordinates sit on a 4 px grid.
 */

const C = {
  paper: "#0b0f17",
  node: "#141b27",
  ink: "#f5f5f5",
  muted: "#a3a3a3",
  soft: "#94a3b8",
  rule: "rgba(245,245,245,0.28)",
  accent: "#fcd34d",
  tint: "rgba(252,211,77,0.08)",
};

const X = [80, 400, 720];
const Y = [40, 200, 360];
const W = 200;
const H = 72;

const nodes: { col: number; row: number; name: string; sub: string; focal?: boolean }[] = [
  { col: 0, row: 0, name: "Night report", sub: "LLM summary + events" },
  { col: 1, row: 0, name: "Alert", sub: "unknown person", focal: true },
  { col: 2, row: 0, name: "Guard's phone", sub: "push notification" },
  { col: 0, row: 1, name: "Live", sub: "all cameras, home" },
  { col: 1, row: 1, name: "Search", sub: "by name or photo" },
  { col: 2, row: 1, name: "Add person", sub: "photos + consent" },
  { col: 0, row: 2, name: "Camera view", sub: "names over faces" },
  { col: 1, row: 2, name: "Person profile", sub: "seen today" },
  { col: 2, row: 2, name: "People", sub: "groups, portraits" },
];

const edges: { d: string; label: string; lx: number; ly: number; focal?: boolean; dashed?: boolean }[] = [
  { d: "M 40 236 L 78 236", label: "SIGN IN", lx: 52, ly: 222 },
  { d: "M 280 76 L 398 76", label: "OPEN EVENT", lx: 339, ly: 66 },
  { d: "M 720 64 L 602 64", label: "TAP NOTIFICATION", lx: 661, ly: 54, focal: true },
  { d: "M 600 96 L 718 96", label: "SEND GUARD", lx: 659, ly: 112 },
  { d: "M 280 224 C 360 224, 440 180, 440 116", label: "CLICK ALERT", lx: 374, ly: 190, focal: true },
  { d: "M 540 112 L 540 198", label: "FIND IN RECORDINGS", lx: 540, ly: 156 },
  { d: "M 580 112 C 580 160, 780 150, 780 198", label: "IT'S SOMEONE WE KNOW", lx: 690, ly: 148 },
  { d: "M 180 272 L 180 358", label: "CLICK CAMERA TILE", lx: 180, ly: 316 },
  { d: "M 420 272 C 420 330, 340 384, 282 384", label: "OPEN MOMENT", lx: 352, ly: 340 },
  { d: "M 280 412 L 398 412", label: "CLICK A FACE", lx: 339, ly: 428 },
  { d: "M 480 358 L 480 274", label: "FIND APPEARANCES", lx: 480, ly: 316 },
  { d: "M 820 358 L 820 274", label: "ADD PERSON", lx: 820, ly: 316 },
  { d: "M 740 272 C 740 340, 660 396, 602 396", label: "SAVE", lx: 700, ly: 348 },
];

const mono = "var(--font-geist-mono), ui-monospace, monospace";
const sans = "var(--font-geist-sans), system-ui, sans-serif";

export function M3Flow() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0b0f17] p-2 [scrollbar-width:thin]">
      <svg viewBox="0 0 960 480" className="h-auto w-full min-w-[720px]" role="img" aria-labelledby="m3-flow-title m3-flow-desc">
        <title id="m3-flow-title">Nau-ino console: screen map</title>
        <desc id="m3-flow-desc">
          After sign-in the guard lands on Live. Clicking an alert, or tapping the phone notification, opens Alert. From Alert staff can send the guard,
          add the person to People, or search the recordings. Search and profiles open the camera at a moment.
        </desc>
        <defs>
          <pattern id="m3dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="rgba(245,245,245,0.07)" />
          </pattern>
          <marker id="m3arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={C.muted} />
          </marker>
          <marker id="m3arrowA" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={C.accent} />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill={C.paper} />
        <rect width="100%" height="100%" fill="url(#m3dots)" />

        {edges.map((e) => (
          <path key={e.label} d={e.d} fill="none" stroke={e.focal ? C.accent : C.muted} strokeWidth={e.focal ? 1.4 : 1.1} markerEnd={`url(#${e.focal ? "m3arrowA" : "m3arrow"})`} />
        ))}

        <circle cx="34" cy="236" r="6" fill={C.ink} />

        {edges.map((e) => {
          const w = Math.ceil((e.label.length * 5.4 + 10) / 4) * 4;
          return (
            <g key={`l-${e.label}`}>
              <rect x={e.lx - w / 2} y={e.ly - 8} width={w} height={12} rx={2} fill={C.paper} />
              <text x={e.lx} y={e.ly + 1} fill={e.focal ? C.accent : C.muted} fontSize="8" fontFamily={mono} textAnchor="middle" letterSpacing="0.06em">
                {e.label}
              </text>
            </g>
          );
        })}

        {nodes.map((n) => {
          const x = X[n.col];
          const y = Y[n.row];
          return (
            <g key={n.name}>
              <rect x={x} y={y} width={W} height={H} rx={8} fill={n.focal ? C.tint : C.node} stroke={n.focal ? C.accent : C.rule} strokeWidth={n.focal ? 1.4 : 1} />
              <text x={x + W / 2} y={y + 33} fill={C.ink} fontSize="14" fontWeight="600" fontFamily={sans} textAnchor="middle">
                {n.name}
              </text>
              <text x={x + W / 2} y={y + 51} fill={n.focal ? C.accent : C.soft} fontSize="10" fontFamily={mono} textAnchor="middle">
                {n.sub}
              </text>
            </g>
          );
        })}

        <text x="480" y="468" fill={C.soft} fontSize="11" fontFamily={sans} textAnchor="middle">
          Not drawn: the sidebar opens Live, People, Search, Reports and Settings from every screen.
        </text>
      </svg>
    </div>
  );
}
