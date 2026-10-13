/**
 * Integration tests against the real PostgreSQL database (needs DATABASE_URL and `npm run db:setup`).
 * They prove the overlap rule holds even when two requests arrive at the same instant.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getPool, query } from "../lib/db";
import { createReservation, cancelReservation } from "../lib/reservations";
import { addDays, todayString } from "../lib/time";

const date = addDays(todayString(), 40); // far enough ahead to never clash with seed data
let userId = "";
let otherUserId = "";
let resourceId = "";
let resource2Id = "";

before(async () => {
  const [u] = await query<{ id: string }>("SELECT id FROM users WHERE email = 'nimal@demo.test'");
  const [o] = await query<{ id: string }>("SELECT id FROM users WHERE email = 'sanduni@demo.test'");
  const [r] = await query<{ id: string }>("SELECT id FROM resources WHERE name = 'Huddle Room B'");
  const [r2] = await query<{ id: string }>("SELECT id FROM resources WHERE name = 'Boardroom'");
  userId = u.id; otherUserId = o.id; resourceId = r.id; resource2Id = r2.id;
  await query("DELETE FROM reservations WHERE title LIKE 'TEST:%'");
});

after(async () => {
  await query("DELETE FROM reservations WHERE title LIKE 'TEST:%'");
  await getPool().end();
});

const book = (over: Partial<Parameters<typeof createReservation>[0]> = {}) =>
  createReservation({ resourceId, userId, title: "TEST: booking", date, startTime: "10:00", endTime: "11:00", ...over });

test("a valid booking succeeds", async () => {
  const r = await book();
  assert.equal(r.ok, true);
});

test("overlapping booking for the same resource is rejected with a helpful message", async () => {
  const r = await book({ userId: otherUserId, startTime: "10:30", endTime: "11:30" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /already booked 10:00–11:00 by Nimal Perera/);
});

test("back-to-back bookings are allowed (end is exclusive)", async () => {
  const r = await book({ startTime: "11:00", endTime: "12:00" });
  assert.equal(r.ok, true);
});

test("same time on a different resource is allowed", async () => {
  const r = await book({ resourceId: resource2Id });
  assert.equal(r.ok, true);
});

test("two simultaneous requests for one slot: exactly one wins", async () => {
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) => book({ userId: i % 2 ? userId : otherUserId, startTime: "14:00", endTime: "15:00" })),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok).length, 7);
});

test("cancelling frees the slot; only the owner (or an admin) can cancel", async () => {
  const created = await book({ startTime: "16:00", endTime: "17:00" });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const stranger = await cancelReservation(created.id, { id: otherUserId, role: "member" });
  assert.equal(stranger.ok, false);
  const owner = await cancelReservation(created.id, { id: userId, role: "member" });
  assert.equal(owner.ok, true);
  const rebook = await book({ userId: otherUserId, startTime: "16:00", endTime: "17:00" });
  assert.equal(rebook.ok, true);
});

test("bookings in the past are rejected", async () => {
  const r = await createReservation({ resourceId, userId, title: "TEST: past", date: addDays(todayString(), -1), startTime: "10:00", endTime: "11:00" });
  assert.equal(r.ok, false);
});
