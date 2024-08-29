import { AgentContext, BaseRecord, type BaseRecordConstructor, JsonTransformer, type Query, RecordDuplicateError, RecordNotFoundError, type StorageService, inject } from '@credo-ts/core'
import { and, desc, eq, sql } from 'drizzle-orm'
import { Logger } from 'tslog'
import { injectable } from 'tsyringe'
import { type AriesStorageRecordModel, ariesStorageRecord } from '../db'
import type { WalletWithConfig } from '../types'
import { DataSourceSymbol } from '../constants'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

const log = new Logger({
	name: 'PostgresStorageService',
})

export type PaginatedQuery<T extends BaseRecord<any, any, any>> = Query<T> & {
	pageSize?: number
	page?: number
}

@injectable()
export class PostgresStorageService<T extends BaseRecord<any, any, any> = BaseRecord<any, any, any>> implements StorageService<T> {
	constructor(@inject(DataSourceSymbol) private readonly db: PostgresJsDatabase) {}
	private recordToInstance(record: AriesStorageRecordModel, recordClass: BaseRecordConstructor<T>): T {
		const instance = JsonTransformer.fromJSON<T>(record.value, recordClass)
		instance.id = record.key!
		instance.replaceTags(record.tags)

		return instance
	}

	async save(agentContext: AgentContext, record: T): Promise<void> {
		record.updatedAt = new Date()
		const value = JsonTransformer.toJSON(record)
		const agentId = (agentContext.wallet as WalletWithConfig).walletConfig!.id

		const existingRecords = await this.db.select().from(ariesStorageRecord).where(and(eq(ariesStorageRecord.key, record.id), eq(ariesStorageRecord.agentId, agentId)))
		if (existingRecords.length > 0) {
			throw new RecordDuplicateError(`Record with id ${record.id} already exists`, { recordType: record.type })
		}
		log.info('saving record with id', record.id)
		await this.db.insert(ariesStorageRecord).values({
			key: record.id,
			type: record.type,
			value: sql`${value}::jsonb`,
			tags: sql`${record.getTags()}::jsonb`,
			agentId: (agentContext.wallet as WalletWithConfig).walletConfig!.id,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
	}

	async update(agentContext: AgentContext, record: T): Promise<void> {
		record.updatedAt = new Date()
		const value = JsonTransformer.toJSON(record)
		delete value._tags
		const agentId = (agentContext.wallet as WalletWithConfig).walletConfig!.id

		const existingRecords = await this.db
			.select()
			.from(ariesStorageRecord)
			.where(and(eq(ariesStorageRecord.key, record.id), eq(ariesStorageRecord.agentId, agentId)))
		if (existingRecords.length === 0) {
			throw new RecordNotFoundError(`record with id ${record.id} not found.`, { recordType: record.type })
		}

		await this.db
			.update(ariesStorageRecord)
			.set({
				value: sql`${value}::jsonb`,
				tags: sql`${record.getTags()}::jsonb`,
				updatedAt: new Date(),
			})
			.where(eq(ariesStorageRecord.key, record.id))
	}

	async delete(agentContext: AgentContext, record: T): Promise<void> {
		log.debug('delete record', record)
		const agentId = (agentContext.wallet as WalletWithConfig).walletConfig!.id
		await this.db.delete(ariesStorageRecord).where(and(eq(ariesStorageRecord.key, record.id), eq(ariesStorageRecord.agentId, agentId)))
	}

	async deleteById(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, id: string): Promise<void> {
		const agentId = (agentContext.wallet as WalletWithConfig).walletConfig!.id
		const existingRecords = await this.db
			.select()
			.from(ariesStorageRecord)
			.where(and(eq(ariesStorageRecord.key, id), eq(ariesStorageRecord.agentId, agentId)))
		if (existingRecords.length === 0) {
			throw new RecordNotFoundError(`record with id ${id} not found.`, { recordType: recordClass.type })
		}

		await this.db.delete(ariesStorageRecord).where(and(eq(ariesStorageRecord.key, id), eq(ariesStorageRecord.agentId, agentId)))
	}

	async getById(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, id: string): Promise<T> {
		const agentId = (agentContext.wallet as WalletWithConfig).walletConfig!.id
		const records = await this.db
			.select()
			.from(ariesStorageRecord)
			.where(and(eq(ariesStorageRecord.agentId, agentId), eq(ariesStorageRecord.key, id), eq(ariesStorageRecord.type, recordClass.type)))

		if (records.length === 0) {
			throw new RecordNotFoundError(`record with id ${id} not found.`, { recordType: recordClass.type })
		}
		const record = records[0]
		return this.recordToInstance(record, recordClass)
	}

	async getAll(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>): Promise<T[]> {
		const agentId = (agentContext.wallet as WalletWithConfig).walletConfig!.id
		const records = await this.db
			.select()
			.from(ariesStorageRecord)
			.where(and(eq(ariesStorageRecord.agentId, agentId), eq(ariesStorageRecord.type, recordClass.type)))
		return records.map((record) => this.recordToInstance(record, recordClass))
	}

	async findByQuery(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, query: PaginatedQuery<T>): Promise<T[]> {
		const agentId = (agentContext.wallet as WalletWithConfig).walletConfig!.id
		const { $and, $or, $not, page, pageSize, ...whereQuery } = query

		let queryBuilder: any = this.db
			.select()
			.from(ariesStorageRecord)
			.where(and(sql`${ariesStorageRecord.tags} @> ${whereQuery}`, eq(ariesStorageRecord.agentId, agentId), eq(ariesStorageRecord.type, recordClass.type)))
			.orderBy(desc(ariesStorageRecord.createdAt))

		if (page && pageSize) {
			queryBuilder = queryBuilder.limit(pageSize).offset((page - 1) * pageSize)
		}
		log.debug('sql', queryBuilder.toSQL())
		const records = await queryBuilder.execute()
		log.debug('findByQuery', query, 'results', records.length)
		const filteredRecords = records.filter((record: any) => filterByQuery(record, query))
		agentContext.config.logger.debug(`filteredRecords len ${filteredRecords.length}`)
		return filteredRecords.map((record: any) => this.recordToInstance(record, recordClass))
	}
}

function filterByQuery<T extends BaseRecord<any, any, any>>(record: AriesStorageRecordModel, query: PaginatedQuery<T>) {
	const { $and, $or, $not, page, pageSize, ...restQuery } = query

	if ($not) {
		throw new Error('$not query not supported in in memory storage')
	}

	// Top level query
	if (!matchSimpleQuery(record, restQuery)) return false

	// All $and queries MUST match
	if ($and) {
		const allAndMatch = ($and as Query<T>[]).every((and) => filterByQuery(record, and))
		if (!allAndMatch) return false
	}

	// Only one $or queries has to match
	if ($or) {
		const oneOrMatch = ($or as Query<T>[]).some((or) => filterByQuery(record, or))
		if (!oneOrMatch) return false
	}

	return true
}

function matchSimpleQuery<T extends BaseRecord<any, any, any>>(record: AriesStorageRecordModel, query: Query<T>) {
	const tags = record.tags as Record<string, any>
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined) continue
		if (Array.isArray(value)) {
			const tagValue = tags[key]
			if (!Array.isArray(tagValue) || !value.every((v) => tagValue.includes(v))) {
				return false
			}
		} else if (tags[key] !== value) {
			return false
		}
	}

	return true
}
