import { ec as EC } from "elliptic"

import { decrypt, encrypt } from "./encryption"
import { split, combine } from "./shamir"
import { OPENWEB3AUTH_URL } from "../constants"
import { generateAddressFromPubKey } from "./keyUtils"
const ec = new EC("secp256k1")

export async function recoverPrivateKeyFromServer(idToken: string) {
	const share1Hex = localStorage.getItem("share1")
	console.log("share1Hex", share1Hex)
	const { id, publicKeyEnc, tempKey } = await createSession(
		idToken
	)
	const shareRes = await fetch(`${OPENWEB3AUTH_URL}/session/${id}/share`, {
		mode: "cors",
		headers: {
			"Authorization": `Bearer ${idToken}`
		},
		method: "GET",
	})
	const { encryptedShare } = await shareRes.json()
	console.log("share data", encryptedShare)
	const serverPubKey = ec.keyFromPublic(publicKeyEnc, "hex")
	console.log("public key enc", serverPubKey)
	const derivedSecret = tempKey.derive(serverPubKey.getPublic())
	const serverShareHex = decrypt(encryptedShare, derivedSecret.toString("hex"))
	console.log("server share hex", serverShareHex)
	// combine local share and server share
	const share = await combine([
		new Uint8Array(Buffer.from(share1Hex!, "hex")),
		new Uint8Array(Buffer.from(serverShareHex, "hex")),
	])
	console.log("share", share)
	const privateKey = ec.keyFromPrivate(Buffer.from(share).toString("hex"), "hex")
	console.log("private key", privateKey)
	const evmAddress = generateAddressFromPubKey(ec, privateKey.getPublic().getX(), privateKey.getPublic().getY())
	return {
		privateKey,
		evmAddress

	}
}

export async function createSession(idToken: string) {

	const tempKey = ec.genKeyPair()
	const publicKey = tempKey.getPublic("hex")
	const res = await fetch(`${OPENWEB3AUTH_URL}/session`, {
		method: "POST",
		mode: "cors",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${idToken}`
		},
		body: JSON.stringify({
			tempPublicKey: publicKey,
			tokenId: idToken
		}),
	})

	const data = await res.json()
	const { id, publicKeyEnc } = data
	return { id, publicKeyEnc, tempKey }
}

export async function createWallet(idToken: string) {
	const tempKey = ec.genKeyPair()
	const publicKey = tempKey.getPublic("hex")
	const res = await fetch(`${OPENWEB3AUTH_URL}/session`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${idToken}`
		},
		body: JSON.stringify({
			tempPublicKey: publicKey,
			tokenId: idToken
		}),
	})

	const data = await res.json()
	const { id, publicKeyEnc } = data
	console.log("session id", id)
	console.log("public key", publicKeyEnc)


	const serverPublicKeyTemp = ec.keyFromPublic(publicKeyEnc, "hex")


	const toUint8Array = (data: string) => new TextEncoder().encode(data);

	const key = ec.genKeyPair()

	// Example of splitting user input
	const input = key.getPrivate("hex");
	const secret = toUint8Array(input);
	const thresold = 2
	const shares = 3
	const [share1, share2, share3] = await split(secret, shares, thresold);


	const share3Hex = Buffer.from(share3).toString("hex")

	// share 1 is stored in the device
	localStorage.setItem("share1", Buffer.from(share1).toString("hex"))

	// share 2 is the recovery share
	localStorage.setItem("share2", Buffer.from(share2).toString("hex"))

	// share 3 is stored in the server

	const derivedSecret = tempKey.derive(serverPublicKeyTemp.getPublic())

	const encryptedShare3 = encrypt(share3Hex, derivedSecret.toString("hex"))

	const uploadShareRes = await fetch(`${OPENWEB3AUTH_URL}/share`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${idToken}`
		},
		body: JSON.stringify({
			encryptedShare: encryptedShare3,
			sessionId: id,
			idToken
		})
	})

	const uploadShareData = await uploadShareRes.json()

	console.log("upload share data", uploadShareData)

}
