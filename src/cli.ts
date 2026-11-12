import { sql } from "drizzle-orm";
import { closeDb, db } from "@/src/db/client";
import { runMigrations } from "@/src/db/migrate";
import { importJson, scrape } from "@/src/jobs/tasks";

const HELP = `Usage: pnpm cli <command>

  migrate             apply database migrations
  scrape              scrape every roaster now and merge into the database
  import:json <file>  seed from an old catalog.json (keeps history; skips known coffees)
  stats               print catalogue numbers
`;

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case "migrate":
      await runMigrations();
      console.log("migrations applied");
      break;
    case "scrape":
      await scrape();
      break;
    case "import:json":
      if (!arg) throw new Error("file path required");
      await importJson(arg);
      break;
    case "stats":
      console.table(
        await db.execute(sql`
          select roaster, count(*)::int as coffees, count(*) filter (where available)::int as available
          from coffees group by 1 order by 1`),
      );
      console.table(
        await db.execute(sql`
          select (select count(*) from purchases)::int as purchases,
                 (select count(*) from prices)::int as price_rows,
                 (select max(started_at) from job_runs where job = 'scrape' and ok) as last_scrape`),
      );
      break;
    default:
      console.log(HELP);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
