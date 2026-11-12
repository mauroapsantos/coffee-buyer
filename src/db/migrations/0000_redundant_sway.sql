CREATE TABLE "availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"coffee_id" text NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coffees" (
	"id" text PRIMARY KEY NOT NULL,
	"roaster" text NOT NULL,
	"roaster_slug" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"available" boolean NOT NULL,
	"purpose" text NOT NULL,
	"producer" text,
	"cultivar" text[] DEFAULT '{}' NOT NULL,
	"process" text,
	"altitude" text,
	"harvest" text,
	"notes" text[] DEFAULT '{}' NOT NULL,
	"price_cents" integer,
	"image_url" text,
	"description" text DEFAULT '' NOT NULL,
	"weight_options" text[] DEFAULT '{}' NOT NULL,
	"grind_options" text[] DEFAULT '{}' NOT NULL,
	"first_seen" date NOT NULL,
	"last_seen" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"stats" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"coffee_id" text NOT NULL,
	"price_cents" integer NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"coffee_id" text PRIMARY KEY NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_coffee_id_coffees_id_fk" FOREIGN KEY ("coffee_id") REFERENCES "public"."coffees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_coffee_id_coffees_id_fk" FOREIGN KEY ("coffee_id") REFERENCES "public"."coffees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_coffee_id_coffees_id_fk" FOREIGN KEY ("coffee_id") REFERENCES "public"."coffees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_coffee_idx" ON "availability" USING btree ("coffee_id","date");--> statement-breakpoint
CREATE INDEX "prices_coffee_idx" ON "prices" USING btree ("coffee_id","seen_at");