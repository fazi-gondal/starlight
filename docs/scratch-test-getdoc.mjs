import { getDocBySlug } from './src/lib/tina/data.js';

try {
  const result = await getDocBySlug('getting-started');
  console.log('Result title:', result?.data?.docs?.title);
} catch (e) {
  console.error('Error fetching doc:', e);
}
