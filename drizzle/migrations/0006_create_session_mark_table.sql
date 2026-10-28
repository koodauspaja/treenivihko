CREATE TABLE "session_mark" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"status" text NOT NULL,
	"trained_on" date,
	"feeling" integer,
	"liked_best_exercise_id" text,
	"liked_least_exercise_id" text,
	"easiest_exercise_id" text,
	"hardest_exercise_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_mark_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "session_mark_status" CHECK ("session_mark"."status" in ('done', 'partly', 'not_done')),
	CONSTRAINT "session_mark_feeling" CHECK ("session_mark"."feeling" between 1 and 5),
	CONSTRAINT "session_mark_not_done" CHECK (("session_mark"."status" = 'not_done') = ("session_mark"."trained_on" is null)),
	CONSTRAINT "session_mark_not_done_empty" CHECK ("session_mark"."status" <> 'not_done' or ("session_mark"."feeling" is null and "session_mark"."liked_best_exercise_id" is null and "session_mark"."liked_least_exercise_id" is null and "session_mark"."easiest_exercise_id" is null and "session_mark"."hardest_exercise_id" is null)),
	CONSTRAINT "session_mark_trained_on" CHECK ("session_mark"."trained_on" between date '0001-01-01' and date '9999-12-31')
);
--> statement-breakpoint
ALTER TABLE "session_mark" ADD CONSTRAINT "session_mark_session_id_training_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_mark" ADD CONSTRAINT "session_mark_liked_best_exercise_id_exercise_id_fk" FOREIGN KEY ("liked_best_exercise_id") REFERENCES "public"."exercise"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_mark" ADD CONSTRAINT "session_mark_liked_least_exercise_id_exercise_id_fk" FOREIGN KEY ("liked_least_exercise_id") REFERENCES "public"."exercise"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_mark" ADD CONSTRAINT "session_mark_easiest_exercise_id_exercise_id_fk" FOREIGN KEY ("easiest_exercise_id") REFERENCES "public"."exercise"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_mark" ADD CONSTRAINT "session_mark_hardest_exercise_id_exercise_id_fk" FOREIGN KEY ("hardest_exercise_id") REFERENCES "public"."exercise"("id") ON DELETE set null ON UPDATE no action;