CREATE TABLE IF NOT EXISTS "anon_creds_credential_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid,
	"tag" text,
	"issuer_id" text,
	"type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anon_creds_schema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"version" text,
	"attributes" jsonb,
	"issuer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anon_creds_credential_definition" ADD CONSTRAINT "anon_creds_credential_definition_schema_id_anon_creds_schema_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."anon_creds_schema"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
