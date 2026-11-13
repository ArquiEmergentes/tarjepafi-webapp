// Levanta la Fake API para los tests BDD sobre una base de datos propia (e2e/.db/db.e2e.json),
// regenerada en cada ejecución. Así los tests no modifican server/db.json.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const db = join(root, 'e2e', '.db', 'db.e2e.json');

mkdirSync(dirname(db), { recursive: true });
execFileSync(process.execPath, [join(root, 'server', 'seed', 'generate-db.mjs'), db], { stdio: 'inherit' });

const bin = join(root, 'node_modules', 'json-server', 'lib', 'cli', 'bin.js');
const api = spawn(process.execPath, [bin, db, '--routes', join(root, 'server', 'routes.json'), '--port', '3000'], { stdio: 'inherit' });
const stop = () => api.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('exit', stop);
