import { z } from "zod"

export const createSessionSchema = z.object({
	tempPublicKey: z.string(),
});
export type CreateSession = z.infer<typeof createSessionSchema>

export const createShareSchema = z.object({
	encryptedShare: z.string(),
	sessionId: z.string(),
});
export type CreateShare = z.infer<typeof createShareSchema>