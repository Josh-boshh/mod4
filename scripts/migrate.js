import 'dotenv/config';
import { runMigrations } from '../lib/migrations.js';

runMigrations()
  .then(() => {
    console.log('Migrations complete.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
