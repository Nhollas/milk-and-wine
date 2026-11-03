import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";

const sliceMapSchema = z.object({
  title: z.string().min(1),
  parts: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        note: z.string().default(""),
        column: z.int().min(0).max(2),
        row: z.int().min(0).max(3),
        exists: z.boolean(),
      }),
    )
    .min(1),
  links: z.array(z.object({ from: z.string(), to: z.string(), exists: z.boolean() })).default([]),
  slices: z
    .array(
      z.object({
        title: z.string().min(1),
        ticket: z.string().optional(),
        delivers: z.array(z.string()).default([]),
        blockedBy: z.array(z.int().min(1)).default([]),
        adds: z.array(z.string()).default([]),
      }),
    )
    .min(1),
});

type SliceMap = z.infer<typeof sliceMapSchema>;
type Part = SliceMap["parts"][number];
type State = "added" | "built" | "unbuilt";

const SANS = "-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Helvetica,Arial,sans-serif";
const INK = "#1f2328";
const MUTED = "#59636e";
const LINE = "#d1d9e0";
const STYLE: Record<State, { fill: string; stroke: string; ink: string; dash: string }> = {
  added: { fill: "#d9822b", stroke: "#b3661a", ink: "#ffffff", dash: "" },
  built: { fill: "#2f5d9e", stroke: "#1f4478", ink: "#ffffff", dash: "" },
  unbuilt: { fill: "#ffffff", stroke: "#8c959f", ink: "#8c959f", dash: "5 4" },
};

const PART_WIDTH = 170;
const PART_HEIGHT = 52;
const GAP_X = 45;
const GAP_Y = 40;
const PANEL_WIDTH = 650;
const PANEL_GAP = 20;
const MARGIN = 40;
const PANEL_TOP = 110;

export function sliceMapSvgOf(input: unknown): string {
  const map = sliceMapSchema.parse(input);
  const known = new Set(map.parts.map((part) => part.id));
  for (const link of map.links) {
    if (!known.has(link.from) || !known.has(link.to)) {
      throw new Error(`Link ${link.from} → ${link.to} names a part the map doesn't have.`);
    }
  }

  const rows = Math.max(...map.parts.map((part) => part.row)) + 1;
  const panelHeight = 70 + rows * (PART_HEIGHT + GAP_Y) + 50;
  const panelRows = Math.ceil(map.slices.length / 2);
  const width = MARGIN * 2 + PANEL_WIDTH * 2 + PANEL_GAP;
  const height = PANEL_TOP + panelRows * (panelHeight + PANEL_GAP) + MARGIN - PANEL_GAP;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${escaped(map.title)}</title>`,
    `<defs>${(["added", "built", "unbuilt"] as const).map((state) => arrowHead(state)).join("")}</defs>`,
    `<rect width="${width}" height="${height}" fill="#f6f8fa"/>`,
    text(MARGIN, 50, map.title, { size: 22, weight: 600 }),
    text(
      MARGIN,
      76,
      "Each panel is the whole system once that slice lands, in the order they land.",
      {
        size: 13,
        fill: MUTED,
      },
    ),
    ...legend(width - MARGIN - 560),
  ];

  for (const [index, slice] of map.slices.entries()) {
    const x = MARGIN + (index % 2) * (PANEL_WIDTH + PANEL_GAP);
    const y = PANEL_TOP + Math.floor(index / 2) * (panelHeight + PANEL_GAP);
    const stateOf = (key: string, exists: boolean): State => {
      if (slice.adds.includes(key)) return "added";
      const addedBy = map.slices.findIndex((other) => other.adds.includes(key));
      if (addedBy === -1) return exists ? "built" : "unbuilt";
      return addedBy < index ? "built" : "unbuilt";
    };

    svg.push(
      `<rect x="${x}" y="${y}" width="${PANEL_WIDTH}" height="${panelHeight}" rx="10" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>`,
      `<circle cx="${x + 28}" cy="${y + 30}" r="13" fill="${STYLE.added.fill}"/>`,
      text(x + 28, y + 35, String(index + 1), {
        size: 13,
        fill: "#ffffff",
        weight: 700,
        anchor: "middle",
      }),
      text(x + 50, y + 36, slice.title, { size: 16, weight: 600 }),
    );
    if (slice.ticket !== undefined) {
      svg.push(
        text(x + PANEL_WIDTH - 20, y + 35, slice.ticket, { size: 13, fill: MUTED, anchor: "end" }),
      );
    }

    const partsTop = y + 70;
    const partsLeft = x + (PANEL_WIDTH - (3 * PART_WIDTH + 2 * GAP_X)) / 2;
    const boxOf = (part: Part): Box => ({
      x: partsLeft + part.column * (PART_WIDTH + GAP_X),
      y: partsTop + part.row * (PART_HEIGHT + GAP_Y),
    });
    const parts = new Map(map.parts.map((part) => [part.id, part]));

    for (const link of map.links) {
      const from = parts.get(link.from);
      const to = parts.get(link.to);
      const twoWay = map.links.some((other) => other.from === link.to && other.to === link.from);
      if (from && to) {
        svg.push(
          linkLine(
            boxOf(from),
            boxOf(to),
            stateOf(`${link.from}>${link.to}`, link.exists),
            twoWay ? 7 : 0,
          ),
        );
      }
    }
    for (const part of map.parts) {
      svg.push(...partBox(boxOf(part), part, stateOf(part.id, part.exists)));
    }

    const footerY = y + panelHeight - 38;
    svg.push(
      `<line x1="${x + 20}" y1="${footerY - 16}" x2="${x + PANEL_WIDTH - 20}" y2="${footerY - 16}" stroke="${LINE}"/>`,
      labelled(
        x + 20,
        footerY,
        "Delivers",
        slice.delivers.length > 0 ? slice.delivers.join(", ") : "no scenario: it prepares the code",
      ),
      labelled(
        x + 20,
        footerY + 21,
        "Blocked by",
        slice.blockedBy.length > 0
          ? slice.blockedBy.map((n) => `slice ${n}`).join(", ")
          : "nothing, so it can start straight away",
      ),
    );
  }

  svg.push("</svg>");
  return `${svg.join("\n")}\n`;
}

type Box = { x: number; y: number };

function partBox(box: Box, part: Part, state: State): string[] {
  const style = STYLE[state];
  const dash = style.dash ? ` stroke-dasharray="${style.dash}"` : "";
  const centre = box.x + PART_WIDTH / 2;
  return [
    `<rect x="${box.x}" y="${box.y}" width="${PART_WIDTH}" height="${PART_HEIGHT}" rx="6" fill="${style.fill}" stroke="${style.stroke}" stroke-width="1.5"${dash}/>`,
    text(centre, box.y + (part.note ? 22 : 31), part.name, {
      size: 13,
      fill: style.ink,
      weight: 600,
      anchor: "middle",
    }),
    part.note
      ? text(centre, box.y + 39, part.note, { size: 10.5, fill: style.ink, anchor: "middle" })
      : "",
  ];
}

function linkLine(from: Box, to: Box, state: State, offset: number): string {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const shift = {
    x: Math.round((-(to.y - from.y) / length) * offset),
    y: Math.round(((to.x - from.x) / length) * offset),
  };
  const start = edgePointOf(from, to, shift);
  const end = edgePointOf(to, from, shift);
  const style = STYLE[state];
  const colour = state === "unbuilt" ? style.stroke : style.fill;
  const dash = style.dash ? ` stroke-dasharray="${style.dash}"` : "";
  return `<path d="M${start.x} ${start.y} L${end.x} ${end.y}" fill="none" stroke="${colour}" stroke-width="1.8"${dash} marker-end="url(#${state})"/>`;
}

function edgePointOf(box: Box, toward: Box, shift: Box): Box {
  const dx = toward.x - box.x;
  const dy = toward.y - box.y;
  const scale = Math.min(
    dx === 0 ? Infinity : (PART_WIDTH / 2 + 3) / Math.abs(dx),
    dy === 0 ? Infinity : (PART_HEIGHT / 2 + 3) / Math.abs(dy),
  );
  return {
    x: Math.round(box.x + PART_WIDTH / 2 + dx * scale) + shift.x,
    y: Math.round(box.y + PART_HEIGHT / 2 + dy * scale) + shift.y,
  };
}

function arrowHead(state: State): string {
  const colour = state === "unbuilt" ? STYLE.unbuilt.stroke : STYLE[state].fill;
  return `<marker id="${state}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${colour}"/></marker>`;
}

function legend(left: number): string[] {
  const entries: [State, string][] = [
    ["added", "Added by this slice"],
    ["built", "Built already, or by an earlier slice"],
    ["unbuilt", "Not built yet"],
  ];
  let x = left;
  return entries.flatMap(([state, label]) => {
    const style = STYLE[state];
    const dash = style.dash ? ` stroke-dasharray="4 2"` : "";
    const swatch = `<rect x="${x}" y="40" width="22" height="14" rx="3" fill="${style.fill}" stroke="${style.stroke}" stroke-width="1.5"${dash}/>`;
    const caption = text(x + 30, 52, label, { size: 12 });
    x += 30 + label.length * 6.4 + 24;
    return [swatch, caption];
  });
}

function labelled(x: number, y: number, label: string, value: string): string {
  return `<text x="${x}" y="${y}" font-family="${SANS}" font-size="12px" fill="${INK}"><tspan font-weight="600">${escaped(label)}</tspan> ${escaped(value)}</text>`;
}

function text(
  x: number,
  y: number,
  value: string,
  {
    size = 12,
    fill = INK,
    weight = 400,
    anchor = "start",
  }: { size?: number; fill?: string; weight?: number; anchor?: string },
): string {
  return `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${size}px" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}">${escaped(value)}</text>`;
}

function escaped(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

if (import.meta.main) {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (inputPath === undefined || outputPath === undefined) {
    throw new Error("Usage: node draw-slice-map.ts <slice-map.json> <slice-map.svg>");
  }
  writeFileSync(outputPath, sliceMapSvgOf(JSON.parse(readFileSync(inputPath, "utf8"))));
}
