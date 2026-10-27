CREATE TABLE "exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"instructions" text NOT NULL,
	"video_url" text,
	"amount_kind" text NOT NULL,
	"amount" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"level" integer NOT NULL,
	"warm_up" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_name_length" CHECK (char_length("exercise"."name") between 1 and 40),
	CONSTRAINT "exercise_instructions_length" CHECK (char_length("exercise"."instructions") between 1 and 1000),
	CONSTRAINT "exercise_video_url" CHECK ("exercise"."video_url" is null or ("exercise"."video_url" like 'https://%' and char_length("exercise"."video_url") <= 500)),
	CONSTRAINT "exercise_amount" CHECK (("exercise"."amount_kind" = 'count' and "exercise"."amount" between 1 and 100) or ("exercise"."amount_kind" = 'time' and "exercise"."amount" between 5 and 600 and "exercise"."amount" % 5 = 0)),
	CONSTRAINT "exercise_duration" CHECK ("exercise"."duration_minutes" between 1 and 30),
	CONSTRAINT "exercise_level" CHECK ("exercise"."level" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "exercise_label" (
	"exercise_id" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "exercise_label_exercise_id_label_pk" PRIMARY KEY("exercise_id","label"),
	CONSTRAINT "exercise_label_known" CHECK (label in ('dribbling', 'feint', 'passing', 'shooting', 'ball_control', 'footwork', 'speed', 'agility', 'balance', 'strength', 'mobility', 'field', 'indoors', 'gym', 'ball', 'ladder', 'hurdles', 'cones', 'goal', 'wall', 'jump_rope'))
);
--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_label" ADD CONSTRAINT "exercise_label_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_user_name_idx" ON "exercise" USING btree ("user_id",lower("name"));