import { Pool, type QueryResultRow } from "pg";
import { getDatabaseUrl } from "./env";

// In dev, Next.js hot-reloads modules; keep one pool on globalThis so we don't leak connections.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

/** Lazily created so importing this file (e.g. during `next build`) never needs a database. */
export function getPool(): Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({ connectionString: getDatabaseUrl(), max: 10 });
  }
  return globalForPg.pgPool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value);

/** Postgres error codes we react to. */
export const PG_EXCLUSION_VIOLATION = "23P01"; // overlapping reservation
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FK_VIOLATION = "23503";

export function pgErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}
