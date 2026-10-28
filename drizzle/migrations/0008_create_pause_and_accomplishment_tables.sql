CREATE TABLE "accomplishment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"earned_on" date NOT NULL,
	"period_starts_on" date,
	"period_weeks" integer,
	"exercise_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accomplishment_user_kind_key" UNIQUE("user_id","kind","key"),
	CONSTRAINT "accomplishment_kind" CHECK (kind in ('sessions_1', 'sessions_10', 'sessions_25', 'sessions_50', 'sessions_100', 'streak_4', 'streak_8', 'streak_12', 'streak_26', 'full_period', 'hard_to_easy')),
	CONSTRAINT "accomplishment_parts" CHECK (case "accomplishment"."kind"
        when 'full_period' then char_length("accomplishment"."key") > 0 and "accomplishment"."period_starts_on" is not null and "accomplishment"."period_weeks" is not null and "accomplishment"."period_weeks" between 1 and 4 and "accomplishment"."exercise_name" is null
        when 'hard_to_easy' then char_length("accomplishment"."key") > 0 and "accomplishment"."exercise_name" is not null and "accomplishment"."period_starts_on" is null and "accomplishment"."period_weeks" is null
        else char_length("accomplishment"."key") = 0 and "accomplishment"."period_starts_on" is null and "accomplishment"."period_weeks" is null and "accomplishment"."exercise_name" is null
      end),
	CONSTRAINT "accomplishment_earned_on" CHECK ("accomplishment"."earned_on" between date '0001-01-01' and date '9999-12-31')
);
--> statement-breakpoint
CREATE TABLE "pause" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pause_days" CHECK ("pause"."ends_on" >= "pause"."starts_on" and "pause"."ends_on" - "pause"."starts_on" <= 181),
	CONSTRAINT "pause_day_bounds" CHECK ("pause"."starts_on" >= date '0001-01-01' and "pause"."ends_on" <= date '9999-12-31')
);
--> statement-breakpoint
ALTER TABLE "accomplishment" ADD CONSTRAINT "accomplishment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pause" ADD CONSTRAINT "pause_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pause_user_id_idx" ON "pause" USING btree ("user_id");