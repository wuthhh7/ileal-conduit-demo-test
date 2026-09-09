import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
const sql = neon(process.env.DATABASE_URL);
const source = await readFile(new URL('../sql/schema.sql', import.meta.url), 'utf8');
for (const statement of source.split(';').map((part) => part.trim()).filter(Boolean)) {
  await sql.query(statement);
}
console.log('Postgres schema is ready.');
