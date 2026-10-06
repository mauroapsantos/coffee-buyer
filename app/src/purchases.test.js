import { describe, expect, it } from 'vitest';
import { loadPurchases, markPurchased, isPurchased, savePurchases } from './purchases.js';

function memoryStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
}

describe('purchases', () => {
  it('loads empty when nothing stored', () => {
    expect(loadPurchases(memoryStorage())).toEqual([]);
  });

  it('loads corrupted data as empty', () => {
    const storage = memoryStorage({ 'coffee-buyer.purchases.v1': '{invalid' });
    expect(loadPurchases(storage)).toEqual([]);
  });

  it('marks a coffee purchased and back', () => {
    let purchases = [];
    purchases = markPurchased(purchases, 'olisipo:a');
    expect(isPurchased(purchases, 'olisipo:a')).toBe(true);
    expect(purchases[0].purchasedAt).toBeTruthy();
    purchases = markPurchased(purchases, 'olisipo:a');
    expect(purchases).toHaveLength(1);
    purchases = markPurchased(purchases, 'olisipo:a', false);
    expect(purchases).toEqual([]);
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    let purchases = markPurchased([], '7g:b');
    savePurchases(purchases, storage);
    expect(isPurchased(loadPurchases(storage), '7g:b')).toBe(true);
  });
});
