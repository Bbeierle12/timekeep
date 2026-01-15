import { seedInitialAdmin } from './initial_admin';
import { pool } from '../connection';

async function run() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.env.INITIAL_ADMIN_NAME;

  if (!email || !password || !name) {
    throw new Error('Missing INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, or INITIAL_ADMIN_NAME');
  }

  const result = await seedInitialAdmin({
    email,
    password,
    name,
    role: 'owner',
    mfaEnabled: true
  });

  console.log(result.created ? 'Seeded admin' : 'Admin already exists', result.adminId);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
