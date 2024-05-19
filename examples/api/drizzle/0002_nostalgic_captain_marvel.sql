ALTER TABLE "encrypted_shares" ADD COLUMN "id_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "encrypted_shares" DROP COLUMN IF EXISTS "user_id";