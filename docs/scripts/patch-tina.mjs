// @ts-check
/**
 * patch-tina.mjs
 *
 * Applies surgical patches to TinaCMS node_modules:
 *
 * 1. @tinacms/graphql  – Windows path fix: folders containing parentheses
 *    (like "New folder (2)") break fast-glob. We escape the base path.
 *
 * 2. @tinacms/mdx  – MDX ESM import fix: files with Astro/MDX component
 *    imports cause a RichTextParseError on `mdxjsEsm` nodes. We make it
 *    treat them as raw HTML instead.
 *
 * 3. tina/__generated__/types.ts  – TypeScript parse error: a required
 *    `client` parameter follows optional `options?`. We make it optional.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootNodeModules = path.resolve(__dirname, '../../node_modules/.pnpm');

let patchedCount = 0;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1: @tinacms/graphql – Windows path glob escaping
// ─────────────────────────────────────────────────────────────────────────────
if (fs.existsSync(rootNodeModules)) {
  const graphqlDirs = fs.readdirSync(rootNodeModules).filter((x) => x.startsWith('@tinacms+graphql'));

  for (const d of graphqlDirs) {
    const distDir = path.join(rootNodeModules, d, 'node_modules/@tinacms/graphql/dist');

    const jsFile = path.join(distDir, 'index.js');
    if (fs.existsSync(jsFile)) {
      let content = fs.readFileSync(jsFile, 'utf8');
      const oldSnippet =
        '    const basePath = import_path5.default.join(this.outputPath, ...pattern.split("/"));\n    const items = await (0, import_fast_glob.default)(\n      import_path5.default.join(basePath, "**", `/*.${extension}`).replace(/\\\\/g, "/"),';
      const newSnippet =
        '    const basePath = (0, import_normalize_path.default)(import_path5.default.join(this.outputPath, ...pattern.split("/")));\n    const escapedBasePath = (0, import_fast_glob.default).escapePath(basePath);\n    const items = await (0, import_fast_glob.default)(\n      `${escapedBasePath}/**/*.${extension}`,';

      if (content.includes(oldSnippet)) {
        content = content.replace(oldSnippet, newSnippet);
        fs.writeFileSync(jsFile, content, 'utf8');
        patchedCount++;
        console.log(`[patch-tina] Patched @tinacms/graphql CJS (${d})`);
      }
    }

    const mjsFile = path.join(distDir, 'index.mjs');
    if (fs.existsSync(mjsFile)) {
      let content = fs.readFileSync(mjsFile, 'utf8');
      const oldSnippetMjs =
        '    const basePath = path6.join(this.outputPath, ...pattern.split("/"));\n    const items = await fg(\n      path6.join(basePath, "**", `/*.${extension}`).replace(/\\\\/g, "/"),';
      const newSnippetMjs =
        '    const basePath = normalize(path6.join(this.outputPath, ...pattern.split("/")));\n    const escapedBasePath = fg.escapePath(basePath);\n    const items = await fg(\n      `${escapedBasePath}/**/*.${extension}`,';

      if (content.includes(oldSnippetMjs)) {
        content = content.replace(oldSnippetMjs, newSnippetMjs);
        fs.writeFileSync(mjsFile, content, 'utf8');
        patchedCount++;
        console.log(`[patch-tina] Patched @tinacms/graphql ESM (${d})`);
      }
    }
  }
} else {
  console.log('[patch-tina] node_modules/.pnpm not found, skipping graphql patch.');
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 2: @tinacms/mdx – Treat mdxjsEsm as HTML instead of throwing
// ─────────────────────────────────────────────────────────────────────────────
if (fs.existsSync(rootNodeModules)) {
  const mdxDirs = fs.readdirSync(rootNodeModules).filter((x) => x.startsWith('@tinacms+mdx'));

  for (const d of mdxDirs) {
    const mdxIndexFile = path.join(rootNodeModules, d, 'node_modules/@tinacms/mdx/dist/index.js');

    if (fs.existsSync(mdxIndexFile)) {
      let content = fs.readFileSync(mdxIndexFile, 'utf8');

      // Already patched marker
      if (content.includes('// @ts-ignore\n      case "mdxFlowExpression":')) {
        console.log(`[patch-tina] @tinacms/mdx already patched (${d})`);
        continue;
      }

      // The original throws on mdxjsEsm/mdxFlowExpression.
      // We replace with a return html2(content4) to pass them through silently.
      const oldThrow = `      case "mdxFlowExpression":\n      case "mdxjsEsm": {\n        throw new RichTextParseError(`;
      const newReturn = `      // @ts-ignore\n      case "mdxFlowExpression":\n      case "mdxjsEsm":\n        return html2(content4);\n      case "__patched_esm__": {\n        throw new RichTextParseError(`;

      if (content.includes(oldThrow)) {
        // Replace and remove the dead code sentinel
        content = content.replace(oldThrow, newReturn);
        // Remove the unreachable sentinel case + its throw body
        content = content.replace(/      case "__patched_esm__": \{\n        throw new RichTextParseError\([^}]+\};\n      \}\n/, '');
        fs.writeFileSync(mdxIndexFile, content, 'utf8');
        patchedCount++;
        console.log(`[patch-tina] Patched @tinacms/mdx ESM imports (${d})`);
      } else {
        // Try simpler pattern (already partially changed)
        const simpleOld = `      case "mdxFlowExpression":\n      case "mdxjsEsm":\n        throw new RichTextParseError(`;
        const simpleNew = `      // @ts-ignore\n      case "mdxFlowExpression":\n      case "mdxjsEsm":\n        return html2(content4);\n      case "__skip__":\n        throw new RichTextParseError(`;

        if (content.includes(simpleOld)) {
          content = content.replace(simpleOld, simpleNew);
          content = content.replace(/      case "__skip__":\n        throw new RichTextParseError\([^)]+\);\n/, '');
          fs.writeFileSync(mdxIndexFile, content, 'utf8');
          patchedCount++;
          console.log(`[patch-tina] Patched @tinacms/mdx ESM imports (simple pattern) (${d})`);
        } else {
          console.log(`[patch-tina] @tinacms/mdx: no matching throw pattern found in (${d}) - may already be fixed`);
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 3: tina/__generated__/types.ts – Fix required param after optional
//          (applied post-generation to catch any existing file)
// ─────────────────────────────────────────────────────────────────────────────
const generatedTypesFile = path.resolve(__dirname, '../tina/__generated__/types.ts');
if (fs.existsSync(generatedTypesFile)) {
  let content = fs.readFileSync(generatedTypesFile, 'utf8');
  const oldClientParam = '    client\n  ) => Promise<any>';
  const newClientParam = '    client?: any\n  ) => Promise<any>';

  if (content.includes(oldClientParam)) {
    content = content.replace(oldClientParam, newClientParam);
    fs.writeFileSync(generatedTypesFile, content, 'utf8');
    patchedCount++;
    console.log('[patch-tina] Patched tina/__generated__/types.ts (client parameter)');
  } else if (content.includes(newClientParam)) {
    console.log('[patch-tina] tina/__generated__/types.ts already patched');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 4: @tinacms/cli generator template – Fix the SOURCE template so that
//          every time tinacms regenerates types.ts it already has `client?: any`
// ─────────────────────────────────────────────────────────────────────────────
if (fs.existsSync(rootNodeModules)) {
  const cliDirs = fs.readdirSync(rootNodeModules).filter((x) => x.startsWith('@tinacms+cli'));

  for (const d of cliDirs) {
    const cliIndexFile = path.join(rootNodeModules, d, 'node_modules/@tinacms/cli/dist/index.js');

    if (fs.existsSync(cliIndexFile)) {
      let content = fs.readFileSync(cliIndexFile, 'utf8');
      const oldTemplate = '    client\n  ) => Promise<any>';
      const newTemplate = '    client?: any\n  ) => Promise<any>';

      if (content.includes(oldTemplate)) {
        content = content.replace(oldTemplate, newTemplate);
        fs.writeFileSync(cliIndexFile, content, 'utf8');
        patchedCount++;
        console.log(`[patch-tina] Patched @tinacms/cli generator template (${d})`);
      } else if (content.includes(newTemplate)) {
        console.log(`[patch-tina] @tinacms/cli template already patched (${d})`);
      } else {
        console.log(`[patch-tina] @tinacms/cli template pattern not found in (${d})`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
if (patchedCount > 0) {
  console.log(`[patch-tina] Applied ${patchedCount} patch(es) successfully.`);
} else {
  console.log('[patch-tina] All patches already applied, nothing to do.');
}
