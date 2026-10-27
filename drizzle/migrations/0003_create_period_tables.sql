CREATE TABLE "block" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"position" integer NOT NULL,
	"theme" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_position" CHECK ("block"."position" >= 1),
	CONSTRAINT "block_theme_length" CHECK (char_length("block"."theme") between 1 and 30),
	CONSTRAINT "block_theme_trimmed" CHECK ("block"."theme" = btrim("block"."theme", E'\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'))
);
--> statement-breakpoint
CREATE TABLE "block_exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"block_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	"amount_kind" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_exercise_position" CHECK ("block_exercise"."position" >= 1),
	CONSTRAINT "block_exercise_amount" CHECK (("block_exercise"."amount_kind" = 'count' and "block_exercise"."amount" between 1 and 100) or ("block_exercise"."amount_kind" = 'time' and "block_exercise"."amount" between 5 and 600 and "block_exercise"."amount" % 5 = 0))
);
--> statement-breakpoint
CREATE TABLE "period" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"starts_on" date NOT NULL,
	"weeks" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "period_weeks" CHECK ("period"."weeks" between 1 and 4)
);
--> statement-breakpoint
CREATE TABLE "training_session" (
	"id" text PRIMARY KEY NOT NULL,
	"period_id" text NOT NULL,
	"position" integer NOT NULL,
	"place" text NOT NULL,
	"target_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "training_session_position" CHECK ("training_session"."position" >= 1),
	CONSTRAINT "training_session_place" CHECK (place in ('field', 'indoors', 'gym')),
	CONSTRAINT "training_session_target" CHECK ("training_session"."target_minutes" between 5 and 120 and "training_session"."target_minutes" % 5 = 0)
);
--> statement-breakpoint
CREATE TABLE "training_session_equipment" (
	"session_id" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "training_session_equipment_session_id_label_pk" PRIMARY KEY("session_id","label"),
	CONSTRAINT "training_session_equipment_known" CHECK (label in ('ball', 'ladder', 'hurdles', 'cones', 'goal', 'wall', 'jump_rope'))
);
--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_session_id_training_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_exercise" ADD CONSTRAINT "block_exercise_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_exercise" ADD CONSTRAINT "block_exercise_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period" ADD CONSTRAINT "period_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_session" ADD CONSTRAINT "training_session_period_id_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."period"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_session_equipment" ADD CONSTRAINT "training_session_equipment_session_id_training_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_exercise_exercise_id_idx" ON "block_exercise" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "period_user_id_idx" ON "period" USING btree ("user_id");