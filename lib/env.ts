/** Timezone used to interpret what people type ("10:00") and to display times. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Colombo";

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and adjust it.");
  }
  return url;
}
