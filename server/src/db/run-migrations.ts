import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect as superuser for migrations
const superuserPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'timekeep',
  user: 'postgres',
  password: 'postgres',  // Default postgres password - adjust if different
});

async function runMigrations() {
  const migrationsDir = join(__dirname, 'migrations');
  const pool = superuserPool;

  // Run migrations 003 and 004
  const migrations = [
    '003_phase3_updates.sql',
    '004_phase4_updates.sql'
  ];

  for (const migration of migrations) {
    const filePath = join(migrationsDir, migration);
    console.log(`Running migration: ${migration}`);

    try {
      const sql = readFileSync(filePath, 'utf-8');
      await pool.query(sql);
      console.log(`  ✓ ${migration} completed`);
    } catch (error: any) {
      // Ignore "already exists" errors for idempotent migrations
      if (error.code === '42701' || error.code === '42710') {
        console.log(`  ✓ ${migration} already applied (skipped)`);
      } else {
        console.error(`  ✗ ${migration} failed:`, error.message);
      }
    }
  }

  console.log('\nMigrations complete!');
}

runMigrations()
  .catch(console.error)
  .finally(() => superuserPool.end());
