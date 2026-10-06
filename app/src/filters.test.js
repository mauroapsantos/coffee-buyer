import { describe, expect, it } from 'vitest';
import { filterCoffees, sortCoffees, formatPrice } from './filters.js';

const coffees = [
  {
    id: 'olisipo:a',
    name: 'El Tambo',
    roaster: 'olisipo',
    purpose: 'espresso',
    available: true,
    notes: ['Molasses', 'Orange Zest'],
    origin: { producer: 'ASMUCAFE', process: 'Washed', cultivar: [] },
    price: { amount: 14.2, currency: 'EUR' },
  },
  {
    id: '7g:b',
    name: 'Kenya Lot 20',
    roaster: '7g',
    purpose: 'filter',
    available: false,
    notes: ['Blackcurrant'],
    origin: { producer: null, process: null, cultivar: ['SL28'] },
    price: null,
  },
  {
    id: 'olisipo:c',
    name: 'Salam Blend',
    roaster: 'olisipo',
    purpose: 'both',
    available: true,
    notes: [],
    origin: { producer: null, process: 'Washed', cultivar: [] },
    price: { amount: 12.0, currency: 'EUR' },
  },
];

describe('filterCoffees', () => {
  it('returns all with default filters', () => {
    expect(filterCoffees(coffees, { roaster: 'all', purpose: 'all', query: '', hideUnavailable: false })).toHaveLength(3);
  });

  it('filters by roaster', () => {
    const result = filterCoffees(coffees, { roaster: '7g', purpose: 'all', query: '', hideUnavailable: false });
    expect(result).toHaveLength(1);
    expect(result[0].roaster).toBe('7g');
  });

  it('filters by purpose', () => {
    const result = filterCoffees(coffees, { roaster: 'all', purpose: 'espresso', query: '', hideUnavailable: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('olisipo:a');
  });

  it('hides unavailable coffees when checkbox is set', () => {
    const result = filterCoffees(coffees, { roaster: 'all', purpose: 'all', query: '', hideUnavailable: true });
    expect(result).toHaveLength(2);
    expect(result.every((coffee) => coffee.available)).toBe(true);
  });

  it('searches name, producer and notes', () => {
    for (const query of ['tambo', 'asmucafe', 'blackcurrant']) {
      const result = filterCoffees(coffees, { roaster: 'all', purpose: 'all', query, hideUnavailable: false });
      expect(result).toHaveLength(1);
    }
  });
});

describe('sortCoffees', () => {
  it('sorts available first for available-first', () => {
    const result = sortCoffees(coffees, 'available-first');
    expect(result[0].available).toBe(true);
    expect(result[result.length - 1].available).toBe(false);
  });

  it('sorts by price ascending, coffees without price last', () => {
    const result = sortCoffees(coffees, 'price-asc');
    expect(result.map((coffee) => coffee.id)).toEqual(['olisipo:c', 'olisipo:a', '7g:b']);
  });

  it('sorts by price descending, coffees without price last', () => {
    const result = sortCoffees(coffees, 'price-desc');
    expect(result.map((coffee) => coffee.id)).toEqual(['olisipo:a', 'olisipo:c', '7g:b']);
  });
});

describe('formatPrice', () => {
  it('formats EUR price', () => {
    expect(formatPrice({ amount: 14.2, currency: 'EUR' })).toContain('14.20');
  });

  it('returns empty string for missing price', () => {
    expect(formatPrice(null)).toBe('');
  });
});
