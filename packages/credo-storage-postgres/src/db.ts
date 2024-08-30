import { sql, type InferSelectModel } from 'drizzle-orm'
import { customType, index, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as migrator from 'drizzle-orm/postgres-js/migrator'

export const customJsonb = <TData>(name: string) =>
	customType<{ data: TData; driverData: TData }>({
		dataType() {
			return 'jsonb'
		},
		toDriver(val: TData) {
			return sql`(((${JSON.stringify(val)})::jsonb)#>> '{}')::jsonb`
		},
		fromDriver(value): TData {
			return value as TData
		},
	})(name)

export const ariesStorageRecord = pgTable(
	'AriesStorageRecord',
	{
		id: uuid('id')
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		key: text('key'),
		type: text('type').notNull(),
		agentId: text('agentId').notNull(),
		value: customJsonb<any>('value').notNull(),
		tags: customJsonb<any>('tags').notNull(),
		createdAt: timestamp('createdAt').defaultNow().notNull(),
		updatedAt: timestamp('updatedAt').defaultNow().notNull(),
	},
	(table) => {
		return {
			agentIdIndex: index().on(table.agentId),
			agentIdTypeIndex: index().on(table.agentId, table.type),
			keyAgentIdUq: unique().on(table.agentId, table.key),
		}
	}
)

export type AriesStorageRecordModel = InferSelectModel<typeof ariesStorageRecord>
// get absolute path inside the node package
import path from 'path'
const migrationsFolder = path.join(__dirname, '..', 'drizzle')

export async function migrate(db: PostgresJsDatabase) {
	await migrator.migrate(db, {
		migrationsFolder,
	})
}
