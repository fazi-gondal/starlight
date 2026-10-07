/**
 * TinaCMS Island Registry for Starlight docs.
 *
 * Each entry defines an editable region that the visual-editing bridge can
 * re-render on every keystroke. The dynamic route
 *   /tina-island/[name]
 * uses this registry via experimental_createIslandRoute().
 *
 * Flow:
 * 1. Page wraps a region in <TinaIsland name="docsBody" params={{ slug }} primary />
 * 2. Bridge detects data changes from the admin sidebar
 * 3. Bridge POSTs overlay data to /tina-island/docsBody?slug=...
 * 4. This registry's fetch + component re-render the fragment
 * 5. Bridge swaps the HTML into the live preview
 *
 * @see https://tina.io/docs/contextual-editing/astro
 */

import type { IslandRegistry } from '@tinacms/astro/experimental';
import DocsBody from '../../components/tina/DocsBody.astro';
import { getDocBySlug } from './data';

type DocsQueryResult = {
  data?: {
    docs?: {
      title?: string;
      description?: string;
      body?: unknown;
      template?: string;
      hero?: unknown;
      [key: string]: unknown;
    } | null;
  };
};

export const islands: IslandRegistry = {
  /**
   * Primary island – the full documentation page body (title + rich-text).
   * Marked as the main form so the admin opens it automatically on load.
   */
  docsBody: {
    fetch: async (_request, params) => {
      const slug = params.get('slug') ?? 'index';
      return getDocBySlug(slug);
    },
    component: DocsBody,
    wrapper: { tag: 'article', attrs: { class: 'tina-island-docs-body' } },
    propsFromData: (raw) => {
      const result = raw as DocsQueryResult;
      return {
        data: result?.data?.docs ?? null,
      };
    },
  },

  /**
   * Title-only island – useful when you want independent click-to-edit
   * on the page title without re-rendering the whole body.
   */
  docsTitle: {
    fetch: async (_request, params) => {
      const slug = params.get('slug') ?? 'index';
      return getDocBySlug(slug);
    },
    component: DocsBody, // re-uses the same component; propsFromData can narrow
    wrapper: { tag: 'h1', attrs: { class: 'tina-island-docs-title' } },
    propsFromData: (raw) => {
      const result = raw as DocsQueryResult;
      const doc = result?.data?.docs;
      return {
        data: doc
          ? { title: doc.title, body: null, description: undefined }
          : null,
      };
    },
  },
};
