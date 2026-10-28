-- What drizzle's schema cannot express (decisions/f008-streaks-and-accomplishments.md).
-- No two of one parent's pauses share a day: a pause's days are [starts_on, ends_on].
-- btree_gist, which migration 0004 created, lets the exclusion compare user_id.
ALTER TABLE "pause" ADD CONSTRAINT "pause_no_overlap" EXCLUDE USING gist ("user_id" WITH =, daterange("starts_on", "ends_on", '[]') WITH &&);
