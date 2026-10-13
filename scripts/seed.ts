/**
 * Demo data so the app is useful on first run. Safe to run more than once.
 * Run with: npm run db:seed
 */
import { Client } from "pg";
import { hashPassword } from "../lib/password";

const USERS = [
  { name: "Ayesha Admin", email: "admin@demo.test", password: "Admin@1234", role: "admin" },
  { name: "Nimal Perera", email: "nimal@demo.test", password: "Member@1234", role: "member" },
  { name: "Sanduni Silva", email: "sanduni@demo.test", password: "Member@1234", role: "member" },
];

const CATEGORIES: Record<string, string> = {
  "Meeting rooms": "Rooms for team meetings and client calls",
  Equipment: "Shared equipment that can be borrowed by the hour",
  Vehicles: "Pool vehicles for official trips",
  Workspaces: "Hot desks and focus booths",
};

const RESOURCES = [
  { name: "Boardroom", category: "Meeting rooms", location: "Level 3", capacity: 14, description: "Large table, wall display and video-conferencing kit." },
  { name: "Huddle Room A", category: "Meeting rooms", location: "Level 2", capacity: 4, description: "Quick stand-ups and small calls." },
  { name: "Huddle Room B", category: "Meeting rooms", location: "Level 2", capacity: 6, description: "Whiteboard wall, good for workshops." },
  { name: "Projector Kit", category: "Equipment", location: "IT store, Level 1", capacity: null, description: "Portable projector, HDMI/USB-C adapters and a screen." },
  { name: "Podcast Recorder", category: "Equipment", location: "IT store, Level 1", capacity: null, description: "Two microphones and a portable audio recorder." },
  { name: "Company Van", category: "Vehicles", location: "Basement parking", capacity: 8, description: "8-seat van. Return with a full tank." },
  { name: "Focus Booth 1", category: "Workspaces", location: "Level 2", capacity: 1, description: "Soundproof single-person booth." },
  { name: "Hot Desk Zone", category: "Workspaces", location: "Level 1", capacity: 10, description: "Open desks near the window." },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    for (const u of USERS) {
      await db.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
         ON CONFLICT (lower(email)) DO NOTHING`,
        [u.name, u.email, await hashPassword(u.password), u.role],
      );
    }
    for (const [name, description] of Object.entries(CATEGORIES)) {
      await db.query("INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT (lower(name)) DO NOTHING", [name, description]);
    }
    for (const r of RESOURCES) {
      await db.query(
        `INSERT INTO resources (category_id, name, description, location, capacity)
         SELECT c.id, $2, $3, $4, $5 FROM categories c WHERE c.name = $1
         ON CONFLICT (lower(name)) DO NOTHING`,
        [r.category, r.name, r.description, r.location, r.capacity],
      );
    }

    // Sample reservations (only when there are none yet), placed relative to "now" so they always look current.
    const { rows } = await db.query("SELECT count(*)::int AS n FROM reservations");
    if (rows[0].n === 0) {
      const sample = [
        // resource, user email, title, start offset (hours from now), duration (hours)
        ["Boardroom", "nimal@demo.test", "Sprint planning", 1, 1.5],
        ["Boardroom", "sanduni@demo.test", "Client demo rehearsal", 4, 1],
        ["Huddle Room A", "sanduni@demo.test", "Design sync", 2, 1],
        ["Projector Kit", "nimal@demo.test", "Workshop at branch office", 26, 4],
        ["Company Van", "admin@demo.test", "Airport pickup", 27, 3],
        ["Focus Booth 1", "nimal@demo.test", "Deep work block", 3, 2],
      ] as const;
      for (const [resource, email, title, startH, durH] of sample) {
        await db.query(
          `INSERT INTO reservations (resource_id, user_id, title, start_time, end_time)
           SELECT r.id, u.id, $3,
                  date_trunc('hour', now()) + make_interval(hours => $4::int),
                  date_trunc('hour', now()) + make_interval(hours => $4::int) + make_interval(mins => ($5::float8 * 60)::int)
             FROM resources r, users u WHERE r.name = $1 AND u.email = $2
           ON CONFLICT DO NOTHING`,
          [resource, email, title, startH, durH],
        );
      }
    }
    console.log("Seed complete. Demo logins:");
    for (const u of USERS) console.log(`  ${u.role.padEnd(6)} ${u.email}  /  ${u.password}`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
