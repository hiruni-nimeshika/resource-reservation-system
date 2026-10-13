-- Adds an optional human-readable floor label for a resource,
-- e.g. "3rd floor", "Ground", "Basement".
-- Nullable on purpose: existing rows have no value, and the field is descriptive.

ALTER TABLE resources
  ADD COLUMN floor text;