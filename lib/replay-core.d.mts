/** Types for lib/replay-core.mjs (pure replay helpers shared with the Node tests). */
export type Marker = { t: number; kind: "page" | "click" | "rage" | "form" | "event"; label: string };
export function splitChunks<T>(events: T[], maxBytes: number): T[][];
export function rageClicks(clicks: { t: number; x: number; y: number }[]): number[];
export function markers(events: { type: number; timestamp: number; data?: unknown }[], analytics?: { ts: number; event: string; path?: string; label?: string }[]): Marker[];
export function clock(ms: number): string;
