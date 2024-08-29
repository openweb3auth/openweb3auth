import cors from 'cors'
import { eq } from 'drizzle-orm'
import { ec as EC } from 'elliptic'
import express, { type Response } from 'express'
import { expressjwt, type GetVerificationKey, type Request } from 'express-jwt'
import jwksClient from 'jwks-rsa'
import { db, encryptedShares } from './db'
import { decrypt, encrypt, generateNonce } from './encryption'
import { WalletLib } from './lib'
import { setupAnoncreds } from './routes/anoncreds'
import { createSessionSchema, createShareSchema } from './schemas'

async function main() {
	const app = express()
	const ec = new EC('secp256k1')

	const port = process.env.PORT || 3015
	const keycloakUrl = process.env.KEYCLOAK_URL as string
	const keycloakRealm = process.env.KEYCLOAK_REALM as string
	if (!keycloakUrl) {
		throw new Error('KEYCLOAK_URL is required')
	}
	if (!keycloakRealm) {
		throw new Error('KEYCLOAK_REALM is required')
	}
	const jwksUri = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`
	// Define the JWT validation middleware
	const checkJwt = expressjwt({
		// Dynamically provide a signing key based on the kid in the header and the signing keys provided by Keycloak JWKS endpoint
		secret: jwksClient.expressJwtSecret({
			cache: true,
			rateLimit: true,
			jwksRequestsPerMinute: 10,
			jwksUri: jwksUri,
		}) as GetVerificationKey,
		credentialsRequired: false,
		// Validate the audience and the issuer
		// audience: keycloakClientId,
		// issuer: `${keycloakDomain}/realms/${keycloakRealm}`,
		algorithms: ['RS256', 'ES256'],
	})
	app.use(checkJwt)
	app.use(cors())
	app.use(express.json())
	const walletLib = new WalletLib()

	const anoncredsRouter = setupAnoncreds(db)
	app.use('/anoncreds', anoncredsRouter)

	app.get('/wallet/info', async (req: Request, res: Response) => {
		try {
			if (!req.auth) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			const userId = req.auth.sub
			if (!userId) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			const share = await walletLib.getEncryptedShareForUserId(userId)
			res.send({ configured: !!share })
		} catch (e) {
			res.status(400).send({ error: (e as any).toString() })
		}
	})
	app.post('/session', async (req: Request, res: Response) => {
		try {
			if (!req.auth) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			const userId = req.auth.sub
			if (!userId) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			const { tempPublicKey } = createSessionSchema.parse(req.body)
			const key = ec.genKeyPair()
			const privateKey = key.getPrivate('hex')
			const publicKeyEnc = key.getPublic('hex')
			const nonce = generateNonce()
			const destPublicKey = ec.keyFromPublic(tempPublicKey, 'hex')
			const encryptedPrivateKey = encrypt(privateKey)
			const session = await walletLib.createSession(userId, encryptedPrivateKey, destPublicKey.getPublic('hex'))

			res.send({ id: session.id, publicKeyEnc })
		} catch (e) {
			res.status(400).send({ error: (e as any).toString() })
		}
	})
	app.post('/share', async (req: Request, res: Response) => {
		try {
			if (!req.auth) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			const userId = req.auth.sub
			if (!userId) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			// check if there's any share for the user
			const share = await walletLib.getEncryptedShareForUserId(userId)
			if (!!share) {
				return res.status(400).send({ error: 'User already has a share' })
			}
			const { encryptedShare, sessionId } = createShareSchema.parse(req.body)
			const session = await walletLib.getSessionById(sessionId)
			if (!session) {
				throw new Error('Session not found')
			}
			const ourPrivateKey = ec.keyFromPrivate(decrypt(session.privateKey), 'hex')
			const destPublicKey = ec.keyFromPublic(session.destPublicKey, 'hex')
			const derivedSecret = ourPrivateKey.derive(destPublicKey.getPublic())
			const decryptedShare = decrypt(encryptedShare, derivedSecret.toString('hex'))
			await db.insert(encryptedShares).values({
				userId,
				nonce: generateNonce(),
				encryptedData: encrypt(decryptedShare),
			})
			res.send({ status: 'ok' })
		} catch (e) {
			res.status(400).send({ error: (e as any).toString() })
		}
	})
	app.get('/session/:id/share', async (req: Request, res: Response) => {
		try {
			if (!req.auth) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			const userId = req.auth.sub
			if (!userId) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			// find session by id param
			const sessionId = req.params.id
			const session = await walletLib.getSessionById(sessionId)
			if (!session) {
				throw new Error('Session not found')
			}
			const shares = await db.select().from(encryptedShares).where(eq(encryptedShares.userId, userId))
			if (shares.length === 0) {
				return res.status(400).send({ error: "User doesn't have a share" })
			}
			const ourPrivateKey = ec.keyFromPrivate(decrypt(session.privateKey), 'hex')
			const destPublicKey = ec.keyFromPublic(session.destPublicKey, 'hex')
			const derivedSecret = ourPrivateKey.derive(destPublicKey.getPublic())
			const decryptedShare = decrypt(shares[0].encryptedData)

			const encryptedShare = encrypt(decryptedShare, derivedSecret.toString('hex'))
			res.send({ encryptedShare, sessionId })
		} catch (e) {
			res.status(400).send({ error: (e as any).toString() })
		}
	})
	app.post('/reset', async (req: Request, res: Response) => {
		try {
			if (!req.auth) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			const userId = req.auth.sub
			if (!userId) {
				return res.status(401).send({ error: 'Unauthorized' })
			}
			await walletLib.deleteEncryptedShareForUserId(userId)
			res.send({ status: 'ok' })
		} catch (e) {
			res.status(400).send({ error: (e as any).toString() })
		}
	})

	app.listen(port, () => {
		console.log(`Server is running on port ${port}`)
	})
}

void main()
