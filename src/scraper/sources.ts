// Per-roaster adapters (ported from scraper/sources.js; same rules).
import {
  REQUEST_DELAY_MS,
  fetchAllProducts,
  fetchJson,
  fetchSitemap,
  fetchText,
  parseLabeledFields,
  sleep,
  splitList,
  stripHtml,
} from "./http";
import { parseSevenGPage } from "./sevengPage";
import type { Purpose, ScrapedCoffee } from "./types";

const OLISIPO_BASE = "https://olisipo.coffee";
const SEVEN_G_BASE = "https://roaster.7groaster.pt";
const SENZU_SHOP_BASE = "https://shop.senzucoffee.com";

type WooProduct = {
  slug: string;
  name: string;
  permalink: string;
  is_in_stock?: boolean;
  short_description?: string;
  description?: string;
  categories?: { slug: string }[];
  tags?: { name: string }[];
  attributes?: { name: string; terms?: { name: string }[] }[];
  images?: { src: string }[];
  prices?: { price?: string; price_range?: { min_amount: string } | null };
};

type ShopifyProduct = {
  handle: string;
  title: string;
  body_html: string;
  images?: { src: string }[];
  variants?: { title: string; price: string; available: boolean }[];
};

const emptyOrigin = () => ({ producer: null, cultivar: [], process: null, altitude: null, harvest: null });

export function purposeFromRoast(roast: string | undefined): Purpose | null {
  const value = (roast ?? "").toLowerCase();
  const hasEspresso = value.includes("espresso");
  const hasFilter = value.includes("filter");
  if (hasEspresso && hasFilter) return "both";
  if (hasEspresso) return "espresso";
  if (hasFilter) return "filter";
  return null;
}

function purposeFromTags(tagNames: string[]): Purpose | null {
  for (const tag of tagNames) {
    const purpose = purposeFromRoast(tag);
    if (purpose) return purpose;
  }
  return null;
}

/** WooCommerce Store API prices are strings in minor units (cents). */
function wooPriceCents(product: WooProduct): number | null {
  const amount = product.prices?.price_range ? product.prices.price_range.min_amount : product.prices?.price;
  const cents = Number(amount);
  return amount && cents ? cents : null;
}

export async function scrapeOlisipo(): Promise<ScrapedCoffee[]> {
  const products = await fetchAllProducts<WooProduct>(OLISIPO_BASE);
  const coffees: ScrapedCoffee[] = [];
  for (const product of products) {
    const categories = (product.categories ?? []).map((c) => c.slug);
    if (!categories.includes("coffee")) continue;
    const fields = parseLabeledFields(stripHtml(product.short_description));
    const tags = (product.tags ?? []).map((t) => t.name);
    coffees.push({
      roaster: "olisipo",
      roasterSlug: product.slug,
      name: stripHtml(product.name),
      url: product.permalink,
      available: Boolean(product.is_in_stock),
      purpose: purposeFromRoast(fields.roast) ?? purposeFromTags(tags) ?? "general",
      origin: {
        producer: fields.producer ?? null,
        cultivar: splitList(fields.cultivar),
        process: fields.process ?? null,
        altitude: fields.altitude ?? null,
        harvest: fields.harvest ?? null,
      },
      notes: splitList(fields.notes),
      priceCents: wooPriceCents(product),
      imageUrl: product.images?.[0]?.src ?? null,
      description: stripHtml(product.description),
      weightOptions: [],
      grindOptions: [],
    });
  }
  return coffees;
}

export async function scrapeSevenG(): Promise<ScrapedCoffee[]> {
  const products = await fetchAllProducts<WooProduct>(SEVEN_G_BASE);
  const sitemapUrls = await fetchSitemap(`${SEVEN_G_BASE}/product-sitemap.xml`);
  const coffeeUrls = new Set(sitemapUrls.filter((url) => url.includes("/loja/cafes/")));

  const seen = new Set<string>();
  const coffees: ScrapedCoffee[] = [];
  for (const product of products) {
    const categories = (product.categories ?? []).map((c) => c.slug);
    if (!categories.includes("cafes")) continue;
    seen.add(product.slug);
    const attributes: Record<string, string[]> = {};
    for (const attribute of product.attributes ?? []) {
      attributes[attribute.name.toLowerCase()] = (attribute.terms ?? []).map((term) => term.name);
    }
    const espresso = categories.includes("espresso");
    const filter = categories.includes("filtro-cafe");
    coffees.push({
      roaster: "7g",
      roasterSlug: product.slug,
      name: stripHtml(product.name),
      url: product.permalink,
      // 7g hides sold-out coffees from the API, so anything listed is in stock.
      available: true,
      purpose: espresso && filter ? "both" : espresso ? "espresso" : filter ? "filter" : "general",
      origin: emptyOrigin(),
      notes: [],
      priceCents: wooPriceCents(product),
      imageUrl: product.images?.[0]?.src ?? null,
      description: stripHtml(product.description),
      weightOptions: attributes.peso ?? [],
      grindOptions: attributes.moagem ?? [],
    });
  }

  // Still in the public sitemap but gone from the API: sold out.
  for (const url of coffeeUrls) {
    const slug = url.replace(/\/$/, "").split("/").pop()!;
    if (seen.has(slug)) continue;
    coffees.push({
      roaster: "7g",
      roasterSlug: slug,
      name: slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      url,
      available: false,
      purpose: "general",
      origin: emptyOrigin(),
      notes: [],
      priceCents: null,
      imageUrl: null,
      description: "",
      weightOptions: [],
      grindOptions: [],
    });
  }

  await addSevenGDetails(coffees);
  return coffees;
}

/**
 * Fill in tasting notes and origin from each public product page, since the
 * API has none. One page every 1.5 s; a page that fails is just skipped.
 */
async function addSevenGDetails(coffees: ScrapedCoffee[]) {
  for (const coffee of coffees) {
    await sleep(REQUEST_DELAY_MS);
    let details;
    try {
      details = parseSevenGPage(await fetchText(coffee.url));
    } catch {
      continue;
    }
    coffee.notes = details.notes;
    coffee.origin = {
      ...coffee.origin,
      producer: details.producer ?? coffee.origin.producer,
      process: details.process ?? coffee.origin.process,
      cultivar: details.cultivar.length ? details.cultivar : coffee.origin.cultivar,
      altitude: details.altitude ?? coffee.origin.altitude,
    };
    // Sold-out coffees only come from the sitemap: use the page's real title and image.
    if (!coffee.available) {
      if (details.name) coffee.name = details.name;
      coffee.imageUrl ??= details.imageUrl;
    }
  }
}

async function fetchSenzuProducts(url: string): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  for (let page = 1; ; page += 1) {
    const separator = url.includes("?") ? "&" : "?";
    const batch = await fetchJson<{ products: ShopifyProduct[] }>(`${url}${separator}page=${page}&limit=250`);
    products.push(...batch.products);
    if (batch.products.length < 250) break;
    await sleep(1500);
  }
  return products;
}

export async function scrapeSenzu(): Promise<ScrapedCoffee[]> {
  const products = await fetchSenzuProducts(`${SENZU_SHOP_BASE}/products.json`);
  const excluded = await fetchSenzuProducts(`${SENZU_SHOP_BASE}/collections/equipamento/products.json`);
  const espresso = new Set(
    (await fetchSenzuProducts(`${SENZU_SHOP_BASE}/collections/espresso-selection/products.json`)).map((p) => p.handle),
  );
  const seasonal = new Set(
    (await fetchSenzuProducts(`${SENZU_SHOP_BASE}/collections/sazonal/products.json`)).map((p) => p.handle),
  );
  const excludedHandles = new Set([
    ...excluded.map((p) => p.handle),
    ...products.filter((p) => p.handle.startsWith("subscricao-")).map((p) => p.handle),
  ]);

  const coffees: ScrapedCoffee[] = [];
  for (const product of products) {
    if (excludedHandles.has(product.handle)) continue;
    const fields = parseLabeledFields(stripHtml(product.body_html));
    const variants = product.variants ?? [];
    const prices = variants.map((v) => Number(v.price)).filter((p) => Number.isFinite(p));
    const isEspresso = espresso.has(product.handle);
    const isSeasonal = seasonal.has(product.handle);
    coffees.push({
      roaster: "senzu",
      roasterSlug: product.handle,
      name: stripHtml(product.title),
      url: `${SENZU_SHOP_BASE}/products/${product.handle}`,
      available: variants.some((v) => v.available),
      purpose: isEspresso && isSeasonal ? "both" : isEspresso ? "espresso" : isSeasonal ? "filter" : "general",
      origin: {
        producer: fields.produtor ?? null,
        cultivar: splitList(fields.variedade),
        process: fields.processo ?? null,
        altitude: fields.altitude ?? null,
        harvest: fields.colheita ?? null,
      },
      notes: splitList(fields.notas),
      // Shopify prices are euro strings ("17.50").
      priceCents: prices.length ? Math.round(Math.min(...prices) * 100) : null,
      imageUrl: product.images?.[0]?.src ?? null,
      description: stripHtml(product.body_html),
      weightOptions: [...new Set(variants.map((v) => v.title).filter(Boolean))],
      grindOptions: [],
    });
  }
  return coffees;
}

export const SOURCES = { olisipo: scrapeOlisipo, "7g": scrapeSevenG, senzu: scrapeSenzu } as const;
