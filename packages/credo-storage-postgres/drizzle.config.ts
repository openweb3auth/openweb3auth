import type { Config } from 'drizzle-kit'
export default {
	schema: './src/db.ts',
	out: './drizzle',
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.POSTGRES_URL!,
	},
} satisfies Config
