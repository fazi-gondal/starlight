# TinaCMS Integration for Starlight Docs

This documentation site is configured with **TinaCMS** for Git-backed visual editing of Markdown/MDX content.

## Quick Start

### 1. Install dependencies (from monorepo root)

```bash
cd starlight
pnpm install
# or from docs/
cd docs
pnpm add tinacms @tinacms/cli @tinacms/astro @astrojs/node
```

### 2. Run the development server

```bash
cd docs
pnpm dev
```

This starts both TinaCMS and Astro:

- **Site**: http://localhost:4321
- **Tina Admin**: http://localhost:4321/admin/index.html

### 3. Edit content

1. Open the admin URL.
2. Select the **Documentation** collection.
3. Open any page (e.g. `getting-started.mdx`).
4. Edit frontmatter fields or the rich-text body.
5. Use the **Embed** button in the rich-text toolbar to insert Starlight components (Aside, Card, Tabs, Steps, FileTree, Badge, Icon, LinkCard, etc.).
6. Save – changes are written directly to the `.mdx` / `.md` files on disk.

## What is configured

| Feature | Status |
|---------|--------|
| Docs collection (`src/content/docs`) | ✅ Full Starlight frontmatter |
| Rich-text body with MDX templates | ✅ Aside, Card, CardGrid, Tabs, TabItem, Steps, FileTree, Badge, Icon, LinkCard, LinkButton |
| Media (local Git-backed) | ✅ `public/uploads` |
| i18n collection | ✅ Basic (extend as needed) |
| Visual / contextual editing | ✅ Full island registry + click-to-edit + preview route |
| Collection router (admin → live URL) | ✅ Maps relativePath → Starlight URL |
| TinaCloud | ⬜ Optional – add `clientId` + `token` in `tina/config.ts` |
| Search indexer | ⬜ Optional – uncomment in config |

## Key files

```
docs/
├── tina/
│   └── config.ts                    # Schema, media, ui.router, build settings
├── src/
│   ├── lib/tina/
│   │   ├── data.ts                  # getDoc / getDocBySlug + requestWithMetadata
│   │   └── islands.ts               # Island registry (docsBody, docsTitle)
│   ├── components/tina/
│   │   └── DocsBody.astro           # Island renderer (title + TinaMarkdown body)
│   ├── pages/
│   │   ├── tina-island/[name].ts    # On-demand island endpoint
│   │   └── tina-preview/[...slug].astro  # Standalone click-to-edit preview
├── public/uploads/                  # Media root
├── astro.config.mjs                 # tina() integration + Node adapter
└── package.json                     # scripts: "dev": "tinacms dev -c \"astro dev\""
```

## Click-to-edit / Visual editing

### How it works

1. The **island registry** (`src/lib/tina/islands.ts`) maps region names (`docsBody`, `docsTitle`) to a fetcher, an Astro component, and a wrapper.
2. The **dynamic route** `/tina-island/[name]` re-renders the matching component on every keystroke.
3. Pages wrap editable regions in `<TinaIsland name="…" params={{ slug }} primary>`.
4. `tinaField(data, 'title')` / `tinaField(data, 'body')` stamp DOM elements so clicking them focuses the correct field in the admin sidebar.
5. The collection `ui.router` tells the admin which live URL to open for a given document.

### Test the flow immediately

After `pnpm dev`:

1. Open http://localhost:4321/admin/index.html
2. Edit any document, or open a preview directly:
   - http://localhost:4321/tina-preview/getting-started/
   - http://localhost:4321/tina-preview/guides/pages/
   - http://localhost:4321/tina-preview/de/getting-started/
3. Inside the admin iframe the `docsBody` island becomes live – typing in the sidebar updates the preview instantly.

### Wiring click-to-edit onto real Starlight pages

Starlight owns page rendering via its own `Page.astro`. To get click-to-edit on the actual `/getting-started/` URLs (not just the preview route) you have two options:

**Option A – Component override (recommended)**

In `astro.config.mjs` under the `starlight({ components: { … } })` option, point `MarkdownContent` and/or `PageTitle` at thin wrappers that include `<TinaIsland>` + `tinaField`. Example wrapper:

```astro
---
// src/components/overrides/MarkdownContent.astro
import Default from '@astrojs/starlight/components/MarkdownContent.astro';
import TinaIsland from '@tinacms/astro/TinaIsland.astro';
// derive slug from Astro.locals.starlightRoute.entry.id
---
<TinaIsland name="docsBody" params={{ slug: Astro.locals.starlightRoute.entry.id }} primary>
  <Default><slot /></Default>
</TinaIsland>
```

**Option B – Keep editing local-only**

Use the admin form UI (no live preview) for day-to-day edits. The preview route is still available for visual QA.

## Frontmatter fields available in the editor

- `title` (required)
- `description`
- `slug`
- `draft`
- `pagefind`
- `template` (`doc` | `splash`)
- `editUrl` / `lastUpdated`
- `sidebar` (label, order, hidden, badge)
- `tableOfContents` (min/max heading level)
- `hero` (title, tagline, image, actions) – for splash pages
- `banner`
- `prev` / `next`
- `head` (custom tags)

## Adding more Starlight components to the editor

Edit the `templates` array inside the `body` rich-text field in `tina/config.ts`.  
Each template becomes an embeddable block in the Tina rich-text toolbar.

Example:

```ts
{
  name: "MyComponent",
  label: "My Component",
  fields: [
    { type: "string", name: "title", label: "Title" },
    { type: "rich-text", name: "children", label: "Content" },
  ],
}
```

Then map the component in your page renderer with `<TinaMarkdown components={{ MyComponent: ... }} />`.

## Production / TinaCloud

1. Create a project at https://app.tina.io
2. Copy Client ID and Token into environment variables or `tina/config.ts`
3. Set `branch` correctly
4. (Optional) Enable search with an indexer token

## Notes

- The monorepo uses `workspace:*` for `@astrojs/starlight`. Always run installs from the root with pnpm.
- Visual editing requires `output: 'server'` + an adapter (currently `@astrojs/node`). For pure static production builds you can keep editing local-only.
- After schema changes run `pnpm tina build` (or restart `pnpm dev`) so the typed client is regenerated.
