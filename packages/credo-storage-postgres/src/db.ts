import { sql, type InferSelectModel } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as migrator from "drizzle-orm/postgres-js/migrator"

export const ariesStorageRecord = pgTable('AriesStorageRecord', {
	id: uuid('id')
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	type: text('type').notNull(),
	agentId: text('agentId').notNull(),
	value: jsonb('value').notNull(),
	tags: jsonb('tags').notNull(),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull()
}, table => {
	return {
		agentIdIndex: index().on(table.agentId),
		agentIdTypeIndex: index().on(table.agentId, table.type)
	};
});

export type AriesStorageRecordModel = InferSelectModel<typeof ariesStorageRecord>
// get absolute path inside the node package
import path from "path"
const migrationsFolder = path.join(__dirname, "..", "drizzle")


export async function migrate(db: PostgresJsDatabase) {
	await migrator.migrate(db, {
		migrationsFolder,
	})
}
