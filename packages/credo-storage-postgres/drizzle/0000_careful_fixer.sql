CREATE TABLE IF NOT EXISTS "AriesStorageRecord" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"agentId" text NOT NULL,
	"value" jsonb NOT NULL,
	"tags" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "AriesStorageRecord_agentId_index" ON "AriesStorageRecord" ("agentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "AriesStorageRecord_agentId_type_index" ON "AriesStorageRecord" ("agentId","type");