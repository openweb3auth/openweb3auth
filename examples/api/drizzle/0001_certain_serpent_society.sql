ALTER TABLE "session" ADD COLUMN "id_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN IF EXISTS "auth_provider";