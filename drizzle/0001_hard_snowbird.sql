CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"support_phone" text,
	"support_email" text,
	"updated_at" timestamp DEFAULT now()
);
