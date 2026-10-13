/**
 * Minimal migration runner: applies db/migrations/*.sql in filename order, once each.
 * Run with: npm run db:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

    const dir = path.join(process.cwd(), "db", "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const done = new Set((await client.query<{ filename: string }>("SELECT filename FROM schema_migrations")).rows.map((r) => r.filename));

    for (const file of files) {
      if (done.has(file)) continue;
      console.log(`Applying ${file} ...`);
      await client.query("BEGIN"); // each migration is all-or-nothing
      try {
        await client.query(await readFile(path.join(dir, file), "utf8"));
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    console.log("Database is up to date.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
