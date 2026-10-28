-- What drizzle's schema cannot express (decisions/f006-session-marks.md).
-- A mark's session is checked at once, as a write expects. Deleting a whole account clears a
-- mark's picks through its exercises after its session has gone through its periods, so that
-- deletion defers this key to its commit, by when the mark has gone too.
ALTER TABLE "session_mark" ALTER CONSTRAINT "session_mark_session_id_training_session_id_fk" DEFERRABLE INITIALLY IMMEDIATE;
