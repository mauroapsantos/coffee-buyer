const STORAGE_KEY = 'coffee-buyer.purchases.v1';

export function loadPurchases(storage = window.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePurchases(purchases, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(purchases));
}

export function markPurchased(purchases, coffeeId, purchased = true) {
  const existing = purchases.find((entry) => entry.coffeeId === coffeeId);
  if (purchased) {
    if (existing) return purchases;
    return [...purchases, { coffeeId, purchasedAt: new Date().toISOString() }];
  }
  return purchases.filter((entry) => entry.coffeeId !== coffeeId);
}

export function isPurchased(purchases, coffeeId) {
  return purchases.some((entry) => entry.coffeeId === coffeeId);
}
