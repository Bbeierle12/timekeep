import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use DATABASE_URL if set (supports both local and Supabase),
// otherwise fall back to local defaults.
const databaseUrl = process.env.DATABASE_URL;

const poolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : undefined,
    }
  : {
      host: 'localhost',
      port: 5432,
      database: 'timekeep',
      user: 'postgres',
      password: 'postgres',
    };

const migrationPool = new Pool(poolConfig);

async function runMigrations() {
  const migrationsDir = join(__dirname, 'migrations');

  const migrations = [
    '001_initial_schema.sql',
    '002_phase1_compliance.sql',
    '003_phase3_updates.sql',
    '004_phase4_updates.sql',
    '005_phase5_security_schema.sql',
    '006_phase2_consents.sql',
    '007_add_reminders_index.sql'
  ];

  console.log(`Connecting to database${databaseUrl?.includes('supabase') ? ' (Supabase)' : ' (local)'}...`);

  for (const migration of migrations) {
    const filePath = join(migrationsDir, migration);
    console.log(`Running migration: ${migration}`);

    try {
      const sql = readFileSync(filePath, 'utf-8');
      await migrationPool.query(sql);
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
  .finally(() => migrationPool.end());
