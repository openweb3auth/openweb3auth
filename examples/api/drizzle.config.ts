import type { Config } from 'drizzle-kit'
console.log(process.env.POSTGRES_URL)
export default {
	schema: './src/db.ts',
	out: './drizzle',
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.POSTGRES_URL!,
	},
} satisfies Config
