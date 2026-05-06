import { initializeDatabase } from '../src/database/init.js';
import { closeDb, getDatabaseLabel } from '../src/database/db.js';
import { env } from '../src/config/env.js';

await initializeDatabase();

console.log(`Banco MySQL inicializado em: ${getDatabaseLabel()}`);
console.log(`Admin: ${env.adminEmail} / ${env.adminPassword}`);

await closeDb();
