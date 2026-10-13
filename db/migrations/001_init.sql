-- Resource Reservation Management System - initial schema
-- Needed so a plain `=` on a uuid column can sit inside a GiST exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL CHECK (length(trim(name)) > 0),
  email         text        NOT NULL,
  password_hash text        NOT NULL,
  role          text        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- Emails are compared case-insensitively.
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text        NOT NULL UNIQUE,   -- only a hash of the cookie token is stored
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (length(trim(name)) > 0),
  description text
);
CREATE UNIQUE INDEX categories_name_lower_key ON categories (lower(name));

CREATE TABLE resources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid        NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  name        text        NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  location    text,
  capacity    integer     CHECK (capacity IS NULL OR capacity > 0),
  is_active   boolean     NOT NULL DEFAULT true,   -- soft "retire": keeps booking history intact
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX resources_name_lower_key ON resources (lower(name));
CREATE INDEX resources_category_idx ON resources (category_id);

CREATE TABLE reservations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  uuid        NOT NULL REFERENCES resources (id) ON DELETE RESTRICT,
  user_id      uuid        NOT NULL REFERENCES users (id)     ON DELETE RESTRICT,
  title        text        NOT NULL CHECK (length(trim(title)) > 0),
  notes        text,
  start_time   timestamptz NOT NULL,
  end_time     timestamptz NOT NULL,
  status       text        NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  cancelled_at timestamptz,
  cancelled_by uuid        REFERENCES users (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reservations_valid_range CHECK (end_time > start_time),

  -- THE key business rule, enforced by the database itself:
  -- two confirmed reservations for the same resource can never overlap.
  -- '[)' = start inclusive, end exclusive, so 10:00-11:00 and 11:00-12:00 are allowed back-to-back.
  -- Because the DB enforces it, two people clicking "Book" at the same instant can't both win.
  CONSTRAINT reservations_no_overlap
    EXCLUDE USING gist (
      resource_id WITH =,
      tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status = 'confirmed')
);
CREATE INDEX reservations_resource_start_idx ON reservations (resource_id, start_time);
CREATE INDEX reservations_user_start_idx     ON reservations (user_id, start_time);
