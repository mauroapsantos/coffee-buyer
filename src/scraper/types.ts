export const ROASTERS = ["olisipo", "7g", "senzu"] as const;
export type Roaster = (typeof ROASTERS)[number];

export const ROASTER_LABEL: Record<string, string> = {
  olisipo: "Olisipo",
  "7g": "7g Roaster",
  senzu: "Senzu",
};

export const PURPOSES = ["general", "espresso", "filter", "both"] as const;
export type Purpose = (typeof PURPOSES)[number];

export const PURPOSE_LABEL: Record<Purpose, string> = {
  general: "General",
  espresso: "Espresso",
  filter: "Filter",
  both: "Espresso & Filter",
};

/** What a roaster adapter returns for one product. */
export type ScrapedCoffee = {
  roaster: Roaster;
  roasterSlug: string;
  name: string;
  url: string;
  available: boolean;
  purpose: Purpose;
  origin: {
    producer: string | null;
    cultivar: string[];
    process: string | null;
    altitude: string | null;
    harvest: string | null;
  };
  notes: string[];
  priceCents: number | null;
  imageUrl: string | null;
  description: string;
  weightOptions: string[];
  grindOptions: string[];
};

export const coffeeId = (c: { roaster: string; roasterSlug: string }) => `${c.roaster}:${c.roasterSlug}`;
