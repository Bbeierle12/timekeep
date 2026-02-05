import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect using environment-configured database URL
if (!config.migrationDatabaseUrl) {
  throw new Error('DATABASE_URL or MIGRATION_DATABASE_URL must be set to run migrations');
}

const superuserPool = new Pool({
  connectionString: config.migrationDatabaseUrl,
});

async function runMigrations() {
  const migrationsDir = join(__dirname, 'migrations');
  const pool = superuserPool;

  // Run migrations 003+
  const migrations = [
    '003_phase3_updates.sql',
    '004_phase4_updates.sql',
    '005_phase5_security_schema.sql',
    '006_phase2_consents.sql',
    '007_add_reminders_index.sql',
    '008_weekly_overtime.sql',
    '009_add_foreign_key_constraints.sql',
    '010_add_performance_indexes.sql'
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
