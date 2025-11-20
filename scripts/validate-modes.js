import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function validateModes() {
  const modeDir = path.resolve('modes');
  const entries = await readdir(modeDir, { withFileTypes: true });
  const targets = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(modeDir, entry.name))
    .sort();

  if (targets.length === 0) {
    console.warn('No mode definitions found in', modeDir);
    return;
  }

  const failures = [];
  for (const file of targets) {
    try {
      const raw = await readFile(file, 'utf8');
      JSON.parse(raw);
      console.log(`✓ ${file}`);
    } catch (error) {
      failures.push({ file, error });
      console.error(`✗ ${file}`);
      console.error(error.message);
    }
  }

  if (failures.length) {
    const err = new Error('Mode validation failed');
    err.failures = failures;
    throw err;
  }
}

validateModes();
