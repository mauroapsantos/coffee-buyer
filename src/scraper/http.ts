// Shared HTTP + parsing helpers (ported from scraper/roasters.js).

export const USER_AGENT = "coffee-buyer/0.1 (+https://github.com/mauroapsantos/coffee-buyer)";
export const REQUEST_DELAY_MS = 1500;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return response.text();
}

export async function fetchJson<T = unknown>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url)) as T;
}

/** All products from a WooCommerce Store API, 100 per page. */
export async function fetchAllProducts<T = unknown>(baseUrl: string): Promise<T[]> {
  const products: T[] = [];
  for (let page = 1; ; page += 1) {
    const batch = await fetchJson<T[]>(`${baseUrl}/wp-json/wc/store/products?per_page=100&page=${page}`);
    products.push(...batch);
    if (batch.length < 100) break;
    await sleep(REQUEST_DELAY_MS);
  }
  return products;
}

export async function fetchSitemap(url: string): Promise<string[]> {
  const xml = await fetchText(url);
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]!.trim());
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h\d|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&ldquo;/g, '"')
    .replace(/&#8221;|&rdquo;/g, '"')
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&#8230;/g, "…")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

/** "Producer: X\nProcess: Y" → { producer: "X", process: "Y" } */
export function parseLabeledFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!text) return fields;
  for (const match of text.matchAll(/([A-Za-zÀ-ÿ]+)\s*:\s*([^\n]+)/g)) {
    const key = match[1]!.toLowerCase().trim();
    const value = match[2]!.trim();
    if (value) fields[key] = value;
  }
  return fields;
}

export function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/,| and | e | – |·/i)
    .map((item) => item.trim())
    .filter(Boolean);
}
