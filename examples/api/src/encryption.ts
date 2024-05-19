import crypto from "crypto"
import { AES256_KEY } from "./constants";

export function generateNonce(): string {
	return crypto.randomBytes(16).toString("hex");
}
export function encrypt(text: string, keyHex = AES256_KEY): string {
	const key = Buffer.from(keyHex, "hex");
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
	const ciphered = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
	return iv.toString('hex') + ':' + ciphered.toString('hex');
}

export function decrypt(ciphertext: string, keyHex = AES256_KEY): string {
	const key = Buffer.from(keyHex, "hex");
	const components = ciphertext.split(':');
	const iv = Buffer.from(components.shift()!, "hex");
	const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
	let deciphered = decipher.update(components.join(':'), "hex", "utf8");
	deciphered += decipher.final("utf8");
	return deciphered;
}
