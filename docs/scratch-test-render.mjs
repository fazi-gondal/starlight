import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

try {
  const data = require('./src/lib/tina/data.ts');
  console.log('Loaded data.ts successfully');
} catch (e) {
  console.error('Failed to load data.ts:', e);
}
