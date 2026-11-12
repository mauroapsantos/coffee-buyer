// 7g Roaster's shop API has no description or tasting notes, so they come
// from the public product page. Two layouts are in use:
//   - current: Elementor image boxes (Processo, Variedade, Altitude, Região)
//     and a "Notas de prova: …" line in the "Perfil sensorial" tab;
//   - older: a "Notas: …" paragraph and a PROCESSO / VARIEDADE / ALTITUDE /
//     REGIÃO table with the values on the row below.
import { splitList } from "./http";

export type SevenGDetails = {
  name: string | null;
  imageUrl: string | null;
  notes: string[];
  producer: string | null;
  process: string | null;
  cultivar: string[];
  altitude: string | null;
};

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Tags out, entities decoded, whitespace collapsed. */
const text = (html: string) =>
  decode(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const LABELS: Record<string, keyof Omit<SevenGDetails, "name" | "imageUrl" | "notes">> = {
  processo: "process",
  variedade: "cultivar",
  variedades: "cultivar",
  altitude: "altitude",
  produtor: "producer",
  produtores: "producer",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function parseSevenGPage(html: string): SevenGDetails {
  const head = html.slice(0, Math.max(0, html.indexOf("<body")));
  const body = html
    .slice(head.length)
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "");

  const fields: Record<string, string> = {};
  const set = (label: string, value: string) => {
    const key = LABELS[label.toLowerCase().trim()];
    if (key && value && !(key in fields)) fields[key] = value;
  };

  // Current layout: image boxes. The first match per label is the coffee
  // itself; related products further down the page come later.
  for (const m of body.matchAll(
    /elementor-image-box-title">([\s\S]*?)<\/h3>\s*<p class="elementor-image-box-description">([\s\S]*?)<\/p>/g,
  )) {
    set(text(m[1]!), text(m[2]!));
  }

  // Older layout: a header row of labels with the values on the next row.
  const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) =>
    [...r[1]!.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => text(c[1]!)),
  );
  rows.forEach((cells, i) => {
    if (!cells.some((c) => c.toLowerCase() in LABELS)) return;
    const values = rows[i + 1] ?? [];
    cells.forEach((label, j) => set(label, values[j] ?? ""));
  });

  const lines = decode(
    body
      .replace(/<\/?br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d|td|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  // "Notas de prova: a, b e c", or a "Notas de prova" heading with the notes on the next line.
  let notesLine: string | undefined;
  for (let i = 0; i < lines.length && !notesLine; i++) {
    const m = /^Notas(?:\s+de\s+prova)?\s*:?\s*(.*)$/i.exec(lines[i]!);
    if (m) notesLine = m[1] || lines[i + 1];
  }
  const notes = splitList(notesLine?.replace(/\.\s*$/, ""))
    .map((n) => capitalize(n.replace(/\.$/, "").trim()))
    .filter(Boolean);

  const title = /<h1[^>]*product_title[^>]*>([\s\S]*?)<\/h1>/i.exec(body)?.[1];
  const image = /<meta property="og:image" content="([^"]+)"/i.exec(head)?.[1];

  return {
    name: title ? text(title) : null,
    imageUrl: image ? decode(image) : null,
    notes,
    producer: fields.producer ?? null,
    process: fields.process ?? null,
    cultivar: splitList(fields.cultivar),
    altitude: fields.altitude ?? null,
  };
}
