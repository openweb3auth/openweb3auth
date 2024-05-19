import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Router } from "express";
import { Logger } from "tslog";
import { v5 as uuidv5 } from 'uuid';
import { anonCredsCredentialDefinition, anonCredsSchema } from '../db'; // Adjust the import path as needed

const log = new Logger({
	name: "Anoncreds"
});

if (!process.env.POSTGRES_URL) {
	throw new Error("POSTGRES_URL is required");
}

export function setupAnoncreds(
	db: PostgresJsDatabase
) {
	const UUID_NAMESPACE = 'your-namespace-uuid'; // Replace with your namespace UUID

	const router = Router();

	router.get('/schemas/:id', async (req, res) => {
		log.info('Getting schema', req.params.id);
		const schema = await db.select().from(anonCredsSchema).where(
			sql`${anonCredsSchema.id} = ${req.params.id}`
		);
		if (schema.length === 0) {
			res.status(404).json({ error: 'Schema not found' });
		} else {
			res.json(schema[0]);
		}
	});

	router.get('/schemas', async (req, res) => {
		log.info('Getting all schemas');
		const { page = "0", take = "10" } = req.query;
		const schemas = await db.select().from(anonCredsSchema)
			.limit(parseInt(take as string))
			.offset(parseInt(page as string) * parseInt(take as string));
		res.json(schemas);
	});

	router.delete('/all', async (req, res) => {
		log.info('Deleting all schemas');
		await db.delete(anonCredsCredentialDefinition).execute();
		await db.delete(anonCredsSchema).execute();
		res.json({ success: true });
	});

	router.post('/schemas', async (req, res) => {
		log.info('Registering schema', req.body);
		const schemaInput = req.body as {
			name: string,
			version: string,
			attrNames: string[],
			issuerId: string,
		};
		const schemaID = `urn:${uuidv5(JSON.stringify(req.body) + Date.now(), UUID_NAMESPACE)}`;
		const newSchema = await db.insert(anonCredsSchema).values({
			id: schemaID,
			name: schemaInput.name,
			version: schemaInput.version,
			attributes: schemaInput.attrNames,
			issuerId: schemaInput.issuerId,
		}).returning();
		res.json(newSchema[0]);
	});

	router.get('/credentialDefinition/:id', async (req, res) => {
		log.info('Getting credential definition', req.params.id);
		const credDef = await db.select().from(anonCredsCredentialDefinition)
			.where(sql`${anonCredsCredentialDefinition.id} = ${req.params.id}`)
			.leftJoin(anonCredsSchema, sql`${anonCredsCredentialDefinition.schemaId} = ${anonCredsSchema.id}`);
		if (credDef.length === 0) {
			res.status(404).json({ error: 'Credential definition not found' });
		} else {
			res.json(credDef[0]);
		}
	});

	router.post('/credentialDefinition', async (req, res) => {
		log.info('Registering credential definition', req.body);
		const credDefInput = req.body as {
			schemaId: string,
			tag: string,
			issuerId: string,
			type: string,
			value: any,
		};
		const schema = await db.select().from(anonCredsSchema).where(sql`${anonCredsSchema.id} = ${credDefInput.schemaId}`);
		if (schema.length === 0) {
			res.status(400).json({ error: 'Schema not found' });
			return;
		}
		const credDefID = `urn:${uuidv5(JSON.stringify(credDefInput) + Date.now(), UUID_NAMESPACE)}`;
		const newCredDef = await db.insert(anonCredsCredentialDefinition).values({
			id: credDefID,
			schemaId: credDefInput.schemaId,
			tag: credDefInput.tag,
			issuerId: credDefInput.issuerId,
			type: credDefInput.type,
			value: credDefInput.value,
		}).returning();
		res.json(newCredDef[0]);
	});

	return router;
}
