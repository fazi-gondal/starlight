/**
 * TinaCMS data helpers for Starlight docs.
 *
 * After `tinacms dev` / `tinacms build` the typed client is generated at:
 *   tina/__generated__/client
 *
 * Every query used on an editable page must be wrapped with requestWithMetadata()
 * so the visual-editing bridge can overlay draft data and stamp tinaField metadata.
 */

import { requestWithMetadata } from '@tinacms/astro';

// The generated client is created on first `tinacms dev` / `tinacms build`.
// Until then this import will fail at type-check time – that is expected.
// @ts-expect-error – generated after first Tina run
import client from '../../../tina/__generated__/client';

export { requestWithMetadata, tinaField, isEditMode } from '@tinacms/astro';
export { client };

/**
 * Fetch a single docs page by relative path (e.g. "getting-started.mdx"
 * or "guides/pages.mdx" or "de/getting-started.mdx").
 */
export async function getDoc(relativePath: string) {
  const result = await requestWithMetadata(
    client.queries.docs({ relativePath }),
    { priority: 'primary' }
  );
  return result;
}

/**
 * Convenience helper that accepts a URL-style slug and maps it to the
 * relativePath stored by Tina (adds .mdx if missing).
 *
 * Examples:
 *   "" or "index"          → "index.mdx"
 *   "getting-started"      → "getting-started.mdx"
 *   "guides/pages"         → "guides/pages.mdx"
 *   "de/getting-started"   → "de/getting-started.mdx"
 */
export async function getDocBySlug(slug: string) {
  let relativePath = slug.replace(/^\/+|\/+$/g, '');
  if (!relativePath || relativePath === 'index') {
    relativePath = 'index.mdx';
  } else if (!relativePath.endsWith('.mdx') && !relativePath.endsWith('.md')) {
    relativePath = `${relativePath}.mdx`;
  }
  return getDoc(relativePath);
}

/**
 * Map a Tina relativePath back to the public URL path used by Starlight.
 * Handles locale prefixes and the special "index" case.
 */
export function relativePathToUrl(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.(mdx?|md)$/, '');
  if (withoutExt === 'index') return '/';
  return `/${withoutExt}/`;
}
