import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const connection = process.env.ARCADE_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL_UNPOOLED || process.env.ARCADE_DATABASE_URL || process.env.DATABASE_URL;
if (!connection) throw new Error('Set ARCADE_DATABASE_URL or DATABASE_URL in the environment before setup.');
const sql = neon(connection);
const source = await readFile(new URL('../server/arcade-schema.sql', import.meta.url), 'utf8');
try {
  for (const statement of source.split('-- migrate:statement').map(part => part.trim()).filter(Boolean)) await sql.query(statement);
  console.log('MezzoPollo Arcade schema ready. Existing payment records preserved.');
} catch {
  console.error('Arcade database setup failed. Check the database connection and schema permissions. No credentials were printed.');
  process.exitCode = 1;
}
