import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSevenGPage } from "./sevengPage";

const fixture = (name: string) => readFileSync(new URL(`../../fixtures/7g/${name}`, import.meta.url), "utf8");

describe("parseSevenGPage", () => {
  it("reads the current layout (image boxes + Perfil sensorial tab)", () => {
    expect(parseSevenGPage(fixture("product-current.html"))).toEqual({
      name: "ETIÓPIA – KEBIR",
      imageUrl: "https://roaster.7groaster.pt/wp-content/uploads/2026/10/etiopia-1.png",
      notes: ["Diospiro", "Abacaxi", "Flor de sabugueiro"],
      producer: null,
      process: "Red honey",
      cultivar: ["Heirloom"],
      altitude: "2.150 MASL",
    });
  });

  it("reads the older layout (Notas paragraph + table) on a sold-out page", () => {
    expect(parseSevenGPage(fixture("product-older-soldout.html"))).toEqual({
      name: "BALI – KARANA",
      imageUrl: "https://roaster.7groaster.pt/wp-content/uploads/2025/12/bali-karana.png",
      notes: ["Licor de cereja", "Chocolate negro", "Amêndoa"],
      producer: null,
      process: "Maceração Carbónica",
      cultivar: ["S795", "Kartika"],
      altitude: "1200 MASL",
    });
  });

  it("reads notes placed on the line after a 'Notas de prova' heading", () => {
    const details = parseSevenGPage(fixture("product-notes-next-line.html"));
    expect(details.notes).toEqual(["Caramelo tostado", "Praline", "Lima"]);
    expect(details.process).toBe("Decaf Sugar Cane EA");
  });

  it("returns empty details for a page without them", () => {
    const details = parseSevenGPage("<html><head></head><body><p>Nada</p></body></html>");
    expect(details.notes).toEqual([]);
    expect(details.process).toBeNull();
    expect(details.name).toBeNull();
  });
});
