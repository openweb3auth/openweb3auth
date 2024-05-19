import { sql, type InferSelectModel } from "drizzle-orm"
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

export const db = drizzle(postgres(process.env.POSTGRES_URL!))

export const sessions = pgTable('session', {
	id: uuid('id')
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	userId: text('user_id').notNull(),
	// encrypted private key
	privateKey: text('private_key').notNull(),
	nonce: text('nonce').notNull(),
	// public key of the client, used to return the share to the client encrypted
	destPublicKey: text('dest_public_key').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Session = InferSelectModel<typeof sessions>

export const encryptedShares = pgTable('encrypted_shares', {
	id: uuid('id')
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	userId: text('user_id').notNull(),
	nonce: text('nonce').notNull(),
	encryptedData: text('encrypted_data').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type EncryptedShare = InferSelectModel<typeof encryptedShares>


export const anonCredsSchema = pgTable('anon_creds_schema', {
	id: uuid('id')
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	name: text('name'),
	version: text('version'),
	attributes: jsonb('attributes'),
	issuerId: text('issuer_id'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const anonCredsCredentialDefinition = pgTable('anon_creds_credential_definition', {
	id: uuid('id')
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	schemaId: uuid('schema_id').references(() => anonCredsSchema.id),
	tag: text('tag'),
	issuerId: text('issuer_id'),
	type: text('type'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
	value: jsonb('value'),
});

export type AnonCredsSchemaModel = InferSelectModel<typeof anonCredsSchema>
export type AnonCredsCredentialDefinitionModel = InferSelectModel<typeof anonCredsCredentialDefinition>
