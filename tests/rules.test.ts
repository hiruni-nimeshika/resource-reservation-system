import { test } from "node:test";
import assert from "node:assert/strict";
import { validateInstants, validateLocalWindow, timeToMinutes } from "../lib/rules";

test("timeToMinutes parses HH:mm and rejects junk", () => {
  assert.equal(timeToMinutes("09:30"), 570);
  assert.equal(timeToMinutes("24:00"), null);
  assert.equal(timeToMinutes("9:30"), null);
});

test("end must be after start", () => {
  assert.match(validateLocalWindow("10:00", "10:00")!, /after/);
  assert.match(validateLocalWindow("11:00", "10:00")!, /after/);
});

test("bookings must be inside opening hours", () => {
  assert.match(validateLocalWindow("05:00", "07:00")!, /between/);
  assert.match(validateLocalWindow("21:00", "22:30")!, /between/);
  assert.equal(validateLocalWindow("06:00", "22:00"), null);
});

const now = new Date("2026-10-20T04:00:00Z");
const at = (iso: string) => new Date(iso);

test("rejects past start, short, long and too-far-ahead bookings", () => {
  assert.match(validateInstants({ start: at("2026-10-20T03:00:00Z"), end: at("2026-10-20T04:00:00Z"), now })!, /passed/);
  assert.match(validateInstants({ start: at("2026-10-20T05:00:00Z"), end: at("2026-10-20T05:10:00Z"), now })!, /at least/);
  assert.match(validateInstants({ start: at("2026-10-20T05:00:00Z"), end: at("2026-10-20T10:00:00Z"), now })!, /at most/);
  assert.equal(validateInstants({ start: at("2026-10-20T05:00:00Z"), end: at("2026-10-20T09:00:00Z"), now }), null);
  assert.match(validateInstants({ start: at("2027-03-01T05:00:00Z"), end: at("2027-03-01T06:00:00Z"), now })!, /ahead/);
});

test("accepts a normal future booking", () => {
  assert.equal(validateInstants({ start: at("2026-10-20T05:00:00Z"), end: at("2026-10-20T06:00:00Z"), now }), null);
});
