-- What drizzle's schema cannot express (decisions/f010-exercise-saved-meanwhile.md).
-- An update of an exercise that leaves its revision as it was raises it, so a writer that
-- does not know the revision, such as the version still serving during a deploy, still counts.
CREATE FUNCTION "exercise_raise_revision"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."revision" = OLD."revision" THEN
    NEW."revision" := OLD."revision" + 1;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "exercise_raise_revision" BEFORE UPDATE ON "exercise" FOR EACH ROW EXECUTE FUNCTION "exercise_raise_revision"();
