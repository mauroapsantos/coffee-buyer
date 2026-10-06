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
    expect(filterCoffees(coffees, { roaster: 'all', purpose: 'all', query: '', availability: 'all' })).toHaveLength(3);
  });

  it('filters by roaster', () => {
    const result = filterCoffees(coffees, { roaster: '7g', purpose: 'all', query: '', availability: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0].roaster).toBe('7g');
  });

  it('filters by purpose', () => {
    const result = filterCoffees(coffees, { roaster: 'all', purpose: 'espresso', query: '', availability: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('olisipo:a');
  });

  it('filters by country derived from the name', () => {
    const result = filterCoffees(coffees, { roaster: 'all', purpose: 'all', query: '', availability: 'all', country: 'kenya' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('7g:b');
  });

  it('ignores unknown countries', () => {
    const result = filterCoffees(coffees, { roaster: 'all', purpose: 'all', query: '', availability: 'all', country: 'brazil' });
    expect(result).toHaveLength(0);
  });

  it('returns all when country is all or missing', () => {
    expect(filterCoffees(coffees, { roaster: 'all', purpose: 'all', query: '', availability: 'all', country: 'all' })).toHaveLength(3);
    expect(filterCoffees(coffees, { roaster: 'all', purpose: 'all', query: '', availability: 'all' })).toHaveLength(3);
  });

  it('filters by availability', () => {
    const result = filterCoffees(coffees, { roaster: 'all', purpose: 'all', query: '', availability: 'unavailable' });
    expect(result).toHaveLength(1);
    expect(result[0].available).toBe(false);
  });

  it('searches name, producer and notes', () => {
    for (const query of ['tambo', 'asmucafe', 'blackcurrant']) {
      const result = filterCoffees(coffees, { roaster: 'all', purpose: 'all', query, availability: 'all' });
      expect(result).toHaveLength(1);
    }
  });
});

describe('sortCoffees', () => {
  it('sorts available first for availability', () => {
    const result = sortCoffees(coffees, 'availability');
    expect(result[0].available).toBe(true);
    expect(result[result.length - 1].available).toBe(false);
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
