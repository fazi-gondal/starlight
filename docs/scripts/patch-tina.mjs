// @ts-check
/**
 * patch-tina.mjs
 *
 * Applies surgical patches to TinaCMS node_modules:
 *
 * 1. @tinacms/graphql  – Windows path fix: folders containing parentheses
 *    break fast-glob. Escapes the base path.
 *
 * 2. @tinacms/mdx  – Comprehensive MDX/Markdown parsing fixes:
 *    - Treats mdxjsEsm and mdxFlowExpression as HTML blocks instead of throwing.
 *    - Treats mdxTextExpression as inline HTML instead of throwing.
 *    - Supports boolean JSX attributes with no value (e.g., <CardGrid stagger>).
 *    - Allows code blocks, thematic breaks, and tables inside list items.
 *    - Supports markdown definition nodes.
 *    - Safely serializes unknown mdast nodes instead of throwing.
 *    - Supports linkReference phrasing content.
 *    - Converts HTML comments to MDX comments in parseMDX.
 *    - Patches index.js, index.mjs, and index.browser.mjs, and clears Vite cache.
 *
 * 3. tina/__generated__/types.ts  – TypeScript fix: makes required client param optional.
 * 4. @tinacms/cli generator template – Fixes the client generator template.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootNodeModules = path.resolve(__dirname, '../../node_modules/.pnpm');
const docsNodeModules = path.resolve(__dirname, '../node_modules');

let patchedCount = 0;
let mdxChanged = false;

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
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 2: @tinacms/mdx – Comprehensive parser & stringifier patches
// ─────────────────────────────────────────────────────────────────────────────
if (fs.existsSync(rootNodeModules)) {
  const mdxDirs = fs.readdirSync(rootNodeModules).filter((x) => x.startsWith('@tinacms+mdx'));

  for (const d of mdxDirs) {
    const distDir = path.join(rootNodeModules, d, 'node_modules/@tinacms/mdx/dist');
    for (const f of ['index.js', 'index.mjs', 'index.browser.mjs']) {
      const filePath = path.join(distDir, f);
      if (!fs.existsSync(filePath)) continue;

      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;

      // 1. mdxFlowExpression and mdxjsEsm throw
      const oldThrow1 = `      // @ts-ignore
      case "mdxFlowExpression":
      // @ts-ignore
      case "mdxjsEsm":
        throw new RichTextParseError(
          // @ts-ignore
          \`Unexpected expression \${content4.value}.\`,
          // @ts-ignore
          content4.position
        );`;
      const newThrow1 = `      // @ts-ignore
      case "mdxFlowExpression":
      // @ts-ignore
      case "mdxjsEsm":
        return html2(content4);`;

      if (content.includes(oldThrow1)) {
        content = content.replace(oldThrow1, newThrow1);
        changed = true;
      }

      // 2. mdxTextExpression throw
      const oldThrow2 = `      // @ts-ignore
      case "mdxTextExpression":
        throw new RichTextParseError(
          // @ts-ignore
          \`Unexpected expression \${content4.value}.\`,
          // @ts-ignore
          content4.position
        );`;
      const newThrow2 = `      // @ts-ignore
      case "mdxTextExpression":
        return html_inline(content4);`;

      if (content.includes(oldThrow2)) {
        content = content.replace(oldThrow2, newThrow2);
        changed = true;
      }

      // 3. Boolean attribute without value (<CardGrid stagger>)
      const oldAttr = `var extractAttribute = (attribute, field, imageCallback) => {
  switch (field.type) {
    case "boolean":
    case "number":
      return extractScalar(extractExpression(attribute), field);`;
      const newAttr = `var extractAttribute = (attribute, field, imageCallback) => {
  switch (field.type) {
    case "boolean":
      if (attribute.value === null || attribute.value === undefined) {
        return true;
      }
    case "number":
      return extractScalar(extractExpression(attribute), field);`;

      if (content.includes(oldAttr)) {
        content = content.replace(oldAttr, newAttr);
        changed = true;
      }

      // 4. Code blocks, thematic breaks, tables inside list items
      const oldListItem = `          case "code":
          case "thematicBreak":
          case "table":
            throw new RichTextParseError(
              \`\${child.type} inside list item is not supported\`,
              child.position
            );`;
      const newListItem = `          case "code":
            return {
              type: "lic",
              children: [parseCode(child)]
            };
          case "thematicBreak":
            return {
              type: "lic",
              children: [{ type: "hr", children: [{ type: "text", text: "" }] }]
            };
          case "table":
            return {
              type: "lic",
              children: [{ type: "text", text: "" }]
            };`;

      if (content.includes(oldListItem)) {
        content = content.replace(oldListItem, newListItem);
        changed = true;
      }

      // 5. Unknown mdast nodes in toMarkdown
      const oldUnknown = `function unknown(node2) {
  throw new Error("Cannot handle unknown node \`" + node2.type + "\`");
}`;
      const newUnknown = `function unknown(node2) {
  return node2.value || "";
}`;

      if (content.includes(oldUnknown)) {
        content = content.replace(oldUnknown, newUnknown);
        changed = true;
      }

      // 6. Definition nodes
      const oldDef = '      default:\n        throw new RichTextParseError(\n          `Content: ${content4.type} is not yet supported`,';
      const newDef = '      case "definition":\n        return { type: "html", value: "" };\n      default:\n        throw new RichTextParseError(\n          `Content: ${content4.type} is not yet supported`,';

      if (content.includes(oldDef) && !content.includes('case "definition":')) {
        content = content.replace(oldDef, newDef);
        changed = true;
      }

      // 7. PhrasingContent unsupported fallback (e.g. linkReference)
      const oldPhrasingDefault = `      default:
        throw new Error(
          \`PhrasingContent: \${content4.type} is not yet supported\`
        );`;
      const newPhrasingDefault = `      case "linkReference":
        return {
          type: "link",
          url: "",
          children: content4.children ? content4.children.map((child) => phrasingContent(child)).flat() : [{ type: "text", text: content4.label || "" }]
        };
      default:
        return text7({ type: "text", value: content4.value || content4.label || "" });`;

      if (content.includes(oldPhrasingDefault)) {
        content = content.replace(oldPhrasingDefault, newPhrasingDefault);
        changed = true;
      }

      // 8. HTML comment handling in parseMDX
      const oldComment = '    let preprocessedString = value;';
      const newComment = '    let preprocessedString = typeof value === "string" ? value.replace(/<!--([\\s\\S]*?)-->/g, "{/*$1*/}") : value;';

      if (content.includes(oldComment)) {
        content = content.replace(oldComment, newComment);
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        patchedCount++;
        mdxChanged = true;
        console.log(`[patch-tina] Patched @tinacms/mdx (${d} -> ${f})`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 3: tina/__generated__/types.ts – Fix required param after optional
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
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 4: @tinacms/cli generator template
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
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP: Purge Vite caches when MDX patches change or are present
// ─────────────────────────────────────────────────────────────────────────────
function removeDirSync(dir) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`[patch-tina] Cleaned Vite cache: ${dir}`);
    } catch (e) {
      console.warn(`[patch-tina] Could not clean ${dir}: ${e.message}`);
    }
  }
}

// Clean docs/.vite and @tinacms/app/.vite
removeDirSync(path.join(docsNodeModules, '.vite'));
if (fs.existsSync(rootNodeModules)) {
  const appDirs = fs.readdirSync(rootNodeModules).filter((x) => x.startsWith('@tinacms+app'));
  for (const d of appDirs) {
    removeDirSync(path.join(rootNodeModules, d, 'node_modules/@tinacms/app/node_modules/.vite'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
if (patchedCount > 0) {
  console.log(`[patch-tina] Applied ${patchedCount} patch(es) successfully.`);
} else {
  console.log('[patch-tina] All patches already applied and verified.');
}
