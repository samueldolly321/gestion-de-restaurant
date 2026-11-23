ALTER TABLE "clients" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_phone" text;