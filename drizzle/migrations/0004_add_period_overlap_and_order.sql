-- What drizzle's schema cannot express (decisions/f004-periods-and-sessions.md).
-- No two of one parent's periods share a day: a period's days are
-- [starts_on, starts_on + 7 * weeks). btree_gist lets the exclusion compare user_id.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "period" ADD CONSTRAINT "period_no_overlap" EXCLUDE USING gist ("user_id" WITH =, daterange("starts_on", "starts_on" + 7 * "weeks") WITH &&);--> statement-breakpoint
-- Positions unique within their parent, checked at commit, so two can swap within one transaction.
ALTER TABLE "training_session" ADD CONSTRAINT "training_session_period_position" UNIQUE ("period_id", "position") DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_session_position" UNIQUE ("session_id", "position") DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "block_exercise" ADD CONSTRAINT "block_exercise_block_position" UNIQUE ("block_id", "position") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
-- A block exercise's exercise is refused deletion at once, as a write expects; deleting a whole
-- account, whose exercises and periods go by two cascades, defers this key to its commit.
ALTER TABLE "block_exercise" ALTER CONSTRAINT "block_exercise_exercise_id_exercise_id_fk" DEFERRABLE INITIALLY IMMEDIATE;
