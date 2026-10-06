export const PURPOSES = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'filter', label: 'Filter' },
  { value: 'both', label: 'Espresso & Filter' },
];

export function filterCoffees(coffees, { roaster, purpose, query, unavailableOnly }) {
  const normalizedQuery = query.trim().toLowerCase();
  return coffees.filter((coffee) => {
    if (roaster !== 'all' && coffee.roaster !== roaster) return false;
    if (purpose !== 'all' && coffee.purpose !== purpose) return false;
    if (unavailableOnly && coffee.available) return false;
    if (normalizedQuery) {
      const haystack = [
        coffee.name,
        coffee.roaster,
        coffee.origin.producer || '',
        coffee.origin.process || '',
        ...(coffee.notes || []),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });
}

export function sortCoffees(coffees, sort = 'name') {
  const sorted = [...coffees];
  if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'roaster') {
    sorted.sort(
      (a, b) => a.roaster.localeCompare(b.roaster) || a.name.localeCompare(b.name)
    );
  } else if (sort === 'availability') {
    sorted.sort(
      (a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name)
    );
  } else if (sort === 'price-asc' || sort === 'price-desc') {
    const direction = sort === 'price-asc' ? 1 : -1;
    sorted.sort((a, b) => {
      const aPrice = a.price ? a.price.amount : null;
      const bPrice = b.price ? b.price.amount : null;
      if (aPrice === null && bPrice === null) return a.name.localeCompare(b.name);
      if (aPrice === null) return 1;
      if (bPrice === null) return -1;
      return (aPrice - bPrice) * direction || a.name.localeCompare(b.name);
    });
  }
  return sorted;
}

export function formatPrice(price) {
  if (!price) return '';
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: price.currency || 'EUR',
  }).format(price.amount);
}
