import { useEffect, useMemo, useState } from 'react';
import catalog from './data/catalog.json';
import {
  loadPurchases,
  savePurchases,
  markPurchased,
  isPurchased,
} from './purchases.js';
import { PURPOSES, filterCoffees, sortCoffees, formatPrice } from './filters.js';
import { collectCountries, countryLabel } from './countries.js';
import './styles.css';

const ROASTERS = ['all', 'olisipo', '7g'];

const AVAILABILITIES = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'No longer available' },
];

function CoffeeCard({ coffee, purchased, onTogglePurchased }) {
  return (
    <article className={`card ${purchased ? 'card-purchased' : ''}`}>
      <div className="card-head">
        <div>
          <h3>{coffee.name}</h3>
          <span className="roaster">{coffee.roaster === '7g' ? '7g Roaster' : 'Olisipo'}</span>
        </div>
        <button
          className={`buy-btn ${purchased ? 'bought' : ''}`}
          onClick={() => onTogglePurchased(coffee.id)}
          title={purchased ? 'Remove from purchased' : 'Mark as purchased'}
        >
          {purchased ? '✓ Bought' : 'Bought?'}
        </button>
      </div>
      <div className="badges">
        <span className={`badge purpose-${coffee.purpose}`}>{coffee.purpose}</span>
        <span className={`badge ${coffee.available ? 'badge-ok' : 'badge-out'}`}>
          {coffee.available ? 'available' : 'no longer available'}
        </span>
        {coffee.price ? <span className="badge badge-price">{formatPrice(coffee.price)}</span> : null}
      </div>
      {coffee.notes.length > 0 && (
        <p className="notes">{coffee.notes.join(' · ')}</p>
      )}
      <dl className="facts">
        {countryLabel(coffee) && (
          <div>
            <dt>Country</dt>
            <dd>{countryLabel(coffee)}</dd>
          </div>
        )}
        {coffee.origin.producer && (
          <div>
            <dt>Producer</dt>
            <dd>{coffee.origin.producer}</dd>
          </div>
        )}
        {coffee.origin.process && (
          <div>
            <dt>Process</dt>
            <dd>{coffee.origin.process}</dd>
          </div>
        )}
        {coffee.origin.cultivar.length > 0 && (
          <div>
            <dt>Cultivar</dt>
            <dd>{coffee.origin.cultivar.join(', ')}</dd>
          </div>
        )}
        {coffee.origin.altitude && (
          <div>
            <dt>Altitude</dt>
            <dd>{coffee.origin.altitude}</dd>
          </div>
        )}
      </dl>
      <a className="shop-link" href={coffee.url} target="_blank" rel="noreferrer">
        View at roaster ↗
      </a>
    </article>
  );
}

function App() {
  const [roaster, setRoaster] = useState('all');
  const [country, setCountry] = useState('all');
  const [purpose, setPurpose] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [query, setQuery] = useState('');
  const [hidePurchased, setHidePurchased] = useState(false);
  const [purchases, setPurchases] = useState(() => loadPurchases());

  useEffect(() => {
    savePurchases(purchases);
  }, [purchases]);

  const countries = useMemo(() => collectCountries(catalog.coffees), []);

  const purchasedIds = useMemo(
    () => new Set(purchases.map((entry) => entry.coffeeId)),
    [purchases]
  );

  const visible = useMemo(() => {
    let coffees = filterCoffees(catalog.coffees, {
      roaster,
      purpose,
      query,
      availability,
      country,
    });
    if (hidePurchased) {
      coffees = coffees.filter((coffee) => !purchasedIds.has(coffee.id));
    }
    return sortCoffees(coffees, 'availability');
  }, [roaster, purpose, query, availability, country, hidePurchased, purchasedIds]);

  const togglePurchased = (coffeeId) => {
    setPurchases((current) => markPurchased(current, coffeeId, !isPurchased(current, coffeeId)));
  };

  return (
    <div className="wrap">
      <header>
        <h1>☕ Coffee Buyer</h1>
        <p className="updated">Catalog updated {catalog.updatedAt}</p>
      </header>

      <div className="filters">
        <input
          type="search"
          placeholder="Search origin, producer, notes…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="select-row">
          <select value={roaster} onChange={(e) => setRoaster(e.target.value)}>
            {ROASTERS.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'All roasters' : value === '7g' ? '7g Roaster' : 'Olisipo'}
              </option>
            ))}
          </select>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {PURPOSES.map((purpose) => (
              <option key={purpose.value} value={purpose.value}>
                {purpose.label}
              </option>
            ))}
          </select>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="all">All countries</option>
            {countries.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
          <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
            {AVAILABILITIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={hidePurchased}
            onChange={(e) => setHidePurchased(e.target.checked)}
          />
          Hide purchased
        </label>
      </div>

      <p className="count">
        {visible.length} coffees · {purchases.length} purchased
      </p>

      <main className="grid">
        {visible.map((coffee) => (
          <CoffeeCard
            key={coffee.id}
            coffee={coffee}
            purchased={purchasedIds.has(coffee.id)}
            onTogglePurchased={togglePurchased}
          />
        ))}
      </main>
    </div>
  );
}

export default App;
