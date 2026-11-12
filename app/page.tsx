import Link from "next/link";
import { ROASTERS, ROASTER_LABEL, PURPOSES, PURPOSE_LABEL } from "@/src/scraper/types";
import { filterCoffees, formatPrice, sortCoffees, SORTS, type Sort } from "@/src/web/filters";
import { lastScrape, listCoffees, type CoffeeRow } from "@/src/web/queries";
import { togglePurchased } from "./actions";

export const dynamic = "force-dynamic";

type Search = Record<string, string | undefined>;

const RECENT_DAYS = 14;
const daysAgo = (date: string) => (Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / 86_400_000;
const dtf = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" });

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const hide = new Set((sp.hide ?? "").split(",").filter(Boolean));
  const sort = (SORTS.find((s) => s.value === sp.sort)?.value ?? "available-first") as Sort;
  const [all, updated] = await Promise.all([listCoffees(), lastScrape()]);

  let visible = filterCoffees(all, {
    roaster: sp.roaster,
    purpose: sp.purpose,
    query: sp.q,
    hideUnavailable: hide.has("out"),
  });
  if (hide.has("bought")) visible = visible.filter((c) => !c.purchasedAt);
  if (sp.bought === "1") visible = visible.filter((c) => c.purchasedAt);
  visible = sortCoffees(visible, sort);

  const link = (patch: Search) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `/?${s}` : "/";
  };
  const toggleHide = (key: string) => {
    const next = new Set(hide);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return link({ hide: [...next].join(",") || undefined });
  };

  const bought = all.filter((c) => c.purchasedAt).length;
  const available = all.filter((c) => c.available).length;

  return (
    <>
      <h1>{sp.q ? `Results for “${sp.q}”` : sp.bought === "1" ? "Bought" : "Coffees"}</h1>
      <p className="muted">
        {visible.length} shown · {available} of {all.length} available · {bought} bought
        {updated && <> · updated {dtf.format(updated)}</>}
      </p>

      <div className="chips">
        <Link className="chip" aria-current={!sp.roaster} href={link({ roaster: undefined })}>
          All roasters
        </Link>
        {ROASTERS.map((r) => (
          <Link key={r} className="chip" aria-current={sp.roaster === r} href={link({ roaster: r })}>
            {ROASTER_LABEL[r]}
          </Link>
        ))}
      </div>
      <div className="chips">
        <Link className="chip" aria-current={!sp.purpose} href={link({ purpose: undefined })}>
          Any use
        </Link>
        {PURPOSES.map((p) => (
          <Link key={p} className="chip" aria-current={sp.purpose === p} href={link({ purpose: p })}>
            {PURPOSE_LABEL[p]}
          </Link>
        ))}
        <span className="chip-gap" />
        <Link className="chip" aria-current={hide.has("out")} href={toggleHide("out")}>
          Hide no longer available
        </Link>
        <Link className="chip" aria-current={hide.has("bought")} href={toggleHide("bought")}>
          Hide bought
        </Link>
      </div>

      <form className="filters" action="/">
        {Object.entries(sp)
          .filter(([k, v]) => v && k !== "sort")
          .map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        <label className="small muted" htmlFor="sort">
          Sort
        </label>
        <select id="sort" name="sort" defaultValue={sort}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost" type="submit">
          Apply
        </button>
      </form>

      {visible.length === 0 ? (
        <div className="empty">No coffees match these filters.</div>
      ) : (
        <div className="grid">
          {visible.map((c) => (
            <CoffeeCard key={c.id} coffee={c} />
          ))}
        </div>
      )}
    </>
  );
}

function CoffeeCard({ coffee: c }: { coffee: CoffeeRow }) {
  const dropPct =
    c.priceCents !== null && c.previousPriceCents !== null && c.previousPriceCents > c.priceCents
      ? Math.round((100 * (c.previousPriceCents - c.priceCents)) / c.previousPriceCents)
      : 0;
  const isNew = c.available && daysAgo(c.firstSeen) <= RECENT_DAYS;
  const isBack =
    c.available && !isNew && c.statusChanges > 1 && c.statusSince !== null && daysAgo(c.statusSince) <= RECENT_DAYS;
  const facts = [
    c.producer,
    c.process,
    c.cultivar.length ? c.cultivar.join(", ") : null,
    c.altitude,
  ].filter(Boolean);

  return (
    <article className={`card ${c.available ? "" : "card-out"} ${c.purchasedAt ? "card-bought" : ""}`}>
      <a className="card-link" href={c.url} target="_blank" rel="noopener noreferrer" title={`Open at ${ROASTER_LABEL[c.roaster]}`}>
        <div className="cover">
          {c.imageUrl ? (
            // Roaster images are already sized for the web; plain <img> keeps the Pi light.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span className="placeholder" aria-hidden>
              ☕
            </span>
          )}
          {dropPct > 0 && <span className="badge badge-deal">-{dropPct}%</span>}
        </div>
        <div className="card-body">
          <div className="row">
            <span className={`badge purpose-${c.purpose}`}>{PURPOSE_LABEL[c.purpose as keyof typeof PURPOSE_LABEL]}</span>
            {!c.available && <span className="badge badge-out">No longer available</span>}
            {isNew && <span className="badge badge-new">New</span>}
            {isBack && <span className="badge badge-new">Back in stock</span>}
          </div>
          <div className="card-title">{c.name}</div>
          <div className="small muted">{ROASTER_LABEL[c.roaster] ?? c.roaster}</div>
          {c.notes.length > 0 && <div className="notes">{c.notes.join(" · ")}</div>}
          {facts.length > 0 && <div className="small muted facts">{facts.join(" · ")}</div>}
          <div className="card-prices">
            {c.priceCents !== null && <span className="price">{formatPrice(c.priceCents)}</span>}
            {dropPct > 0 && <span className="strike">{formatPrice(c.previousPriceCents)}</span>}
            <span className="shop">Shop ↗</span>
          </div>
        </div>
      </a>
      <form action={togglePurchased} className="card-actions">
        <input type="hidden" name="coffeeId" value={c.id} />
        <button className={`btn ${c.purchasedAt ? "btn-ok" : "btn-ghost"}`} type="submit">
          {c.purchasedAt ? "✓ Bought" : "Bought?"}
        </button>
        {c.purchasedAt && (
          <span className="small muted">{c.purchasedAt.toLocaleDateString("en-GB", { timeZone: "Europe/Lisbon" })}</span>
        )}
      </form>
    </article>
  );
}
