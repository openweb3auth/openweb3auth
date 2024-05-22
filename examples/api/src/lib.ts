import { eq } from "drizzle-orm"
import { db, encryptedShares, sessions } from "./db"
import { generateNonce } from "./encryption"
export interface EncryptedShare {
	id: string
	userId: string
	nonce: string
	encryptedData: string
	createdAt: Date
	updatedAt: Date
}
export interface Session {
	id: string
	userId: string
	privateKey: string
	nonce: string
	destPublicKey: string
	createdAt: Date
	updatedAt: Date
}
export interface IWallet {
	getEncryptedShareForUserId(userId: string): Promise<EncryptedShare | null>
	getSessionById(sessionId: string): Promise<Session | null>
	createSession(userId: string, privateKey: string, destPublicKey: string): Promise<Session>
	createEncryptedShare(userId: string, nonce: string, encryptedData: string): Promise<EncryptedShare>
	deleteEncryptedShareForUserId(userId: string): Promise<void>
}

export class WalletLib implements IWallet {
	async getEncryptedShareForUserId(userId: string): Promise<EncryptedShare | null> {
		const shares = await db.select().from(encryptedShares).where(eq(
			encryptedShares.userId,
			userId
		))
		if (shares.length === 0) {
			return null
		}
		return shares[0]
	}
	async getSessionById(sessionId: string): Promise<Session | null> {
		const sessionList = await db.select().from(sessions).where(eq(
			sessions.id,
			sessionId
		))
		if (sessionList.length === 0) {
			return null
		}
		return sessionList[0]
	}
	async createSession(userId: string, encryptedPrivateKey: string, destPublicKey: string): Promise<Session> {
		const nonce = generateNonce()
		const insertedSessions = await db.insert(sessions).values({
			destPublicKey,
			privateKey: encryptedPrivateKey,
			nonce,
			userId,
		}).returning({
			id: sessions.id
		})
		const insertedSessionId = insertedSessions[0].id
		const sessionList = await db.select().from(sessions).where(eq(
			sessions.id,
			insertedSessionId
		))
		return sessionList[0]
	}
	async createEncryptedShare(userId: string, nonce: string, encryptedData: string): Promise<EncryptedShare> {
		const insertedShares = await db.insert(encryptedShares).values({
			userId,
			nonce: generateNonce(),
			encryptedData,
		}).returning({
			id: encryptedShares.id
		})
		const shares = await db.select().from(encryptedShares).where(eq(
			encryptedShares.id,
			insertedShares[0].id
		))
		return shares[0]

	}
	async deleteEncryptedShareForUserId(userId: string): Promise<void> {
		await db.delete(encryptedShares).where(eq(
			encryptedShares.userId,
			userId
		))
	}
}