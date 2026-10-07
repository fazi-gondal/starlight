/**
 * On-demand island endpoint used by the TinaCMS visual-editing bridge.
 *
 * The bridge POSTs draft overlay data here on every keystroke (debounced).
 * experimental_createIslandRoute looks up the island name in the registry,
 * re-renders the registered Astro component, and returns an HTML fragment
 * that the bridge swaps into the live preview.
 *
 * Keep prerender = false so the route is always dynamic (required for both
 * SSR and static-site editing modes).
 */
import { experimental_createIslandRoute } from '@tinacms/astro/experimental';
import { islands } from '../../lib/tina/islands';

export const prerender = false;

// Support GET (initial bootstrap on static pages) and POST (live updates)
export const { GET, POST, ALL } = experimental_createIslandRoute(islands) as any;
