CREATE TABLE "investment_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"label" text NOT NULL,
	"category" text DEFAULT 'autre' NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"invest_date" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "opening_date" text;--> statement-breakpoint
ALTER TABLE "investment_items" ADD CONSTRAINT "investment_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;