ALTER TABLE "encrypted_shares" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "encrypted_shares" DROP COLUMN IF EXISTS "id_token";--> statement-breakpoint
ALTER TABLE "encrypted_shares" DROP COLUMN IF EXISTS "auth_provider";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN IF EXISTS "id_token";