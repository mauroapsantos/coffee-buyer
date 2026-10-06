import { describe, expect, it } from 'vitest';
import { collectCountries, countryFromCoffee } from './countries.js';

const coffee = (name) => ({ name });

describe('countryFromCoffee', () => {
  it('detects plain country names', () => {
    expect(countryFromCoffee(coffee('Colombia El Vergel Estate'))).toBe('colombia');
    expect(countryFromCoffee(coffee('Brasil Daterra'))).toBe('brazil');
  });

  it('normalizes accents and case', () => {
    expect(countryFromCoffee(coffee('ETIÓPIA – AYLA BOMBE'))).toBe('ethiopia');
    expect(countryFromCoffee(coffee('QUÊNIA – NDUNDURI AA'))).toBe('kenya');
  });

  it('maps regional aliases to a country', () => {
    expect(countryFromCoffee(coffee('Karana – Bali – Indonesia'))).toBe('indonesia');
    expect(countryFromCoffee(coffee('Asman Gayo – Sumatra – Indonesia'))).toBe('indonesia');
  });

  it('returns null when no country is mentioned', () => {
    expect(countryFromCoffee(coffee('Salam Blend'))).toBeNull();
    expect(countryFromCoffee(coffee(''))).toBeNull();
    expect(countryFromCoffee(null)).toBeNull();
  });
});

describe('collectCountries', () => {
  it('returns unique countries present in the catalog', () => {
    const countries = collectCountries([
      coffee('Colombia Jairo Lopez'),
      coffee('Etiopia Halo Beriti'),
      coffee('Colombia Nestor Lasso 1'),
    ]);
    expect(countries).toEqual([
      { value: 'colombia', label: 'Colombia' },
      { value: 'ethiopia', label: 'Ethiopia' },
    ]);
  });

  it('returns empty list when nothing matches', () => {
    expect(collectCountries([coffee('Ajuda Blend')])).toEqual([]);
  });
});
