const COUNTRIES = [
  { value: 'brazil', label: 'Brazil', aliases: ['brasil', 'brazil'] },
  { value: 'colombia', label: 'Colombia', aliases: ['colombia'] },
  { value: 'ethiopia', label: 'Ethiopia', aliases: ['etiopia', 'ethiopia'] },
  { value: 'kenya', label: 'Kenya', aliases: ['kenya', 'quenia'] },
  { value: 'honduras', label: 'Honduras', aliases: ['honduras'] },
  { value: 'guatemala', label: 'Guatemala', aliases: ['guatemala'] },
  { value: 'burundi', label: 'Burundi', aliases: ['burundi'] },
  { value: 'rwanda', label: 'Rwanda', aliases: ['ruanda', 'rwanda'] },
  { value: 'uganda', label: 'Uganda', aliases: ['uganda'] },
  { value: 'peru', label: 'Peru', aliases: ['peru'] },
  { value: 'indonesia', label: 'Indonesia', aliases: ['indonesia', 'sumatra', 'bali'] },
  { value: 'el-salvador', label: 'El Salvador', aliases: ['el salvador'] },
  { value: 'mexico', label: 'Mexico', aliases: ['mexico'] },
  { value: 'costa-rica', label: 'Costa Rica', aliases: ['costa rica'] },
  { value: 'papua-new-guinea', label: 'Papua New Guinea', aliases: ['papua'] },
  { value: 'myanmar', label: 'Myanmar', aliases: ['myanmar'] },
];

function normalize(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function countryFromCoffee(coffee) {
  const name = normalize(coffee && coffee.name);
  if (!name) return null;
  for (const country of COUNTRIES) {
    for (const alias of country.aliases) {
      if (name.includes(alias)) return country.value;
    }
  }
  return null;
}

export function countryLabel(coffee) {
  const value = countryFromCoffee(coffee);
  if (!value) return null;
  const country = COUNTRIES.find((entry) => entry.value === value);
  return country.label;
}

export function collectCountries(coffees) {
  const found = new Map();
  for (const coffee of coffees) {
    const value = countryFromCoffee(coffee);
    if (value && !found.has(value)) {
      const country = COUNTRIES.find((entry) => entry.value === value);
      found.set(value, country.label);
    }
  }
  return [...found.entries()].map(([value, label]) => ({ value, label }));
}
