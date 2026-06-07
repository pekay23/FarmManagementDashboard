/**
 * patches/patch-eslint-plugin-react.mjs
 *
 * Re-applies the ESLint 10 compatibility patch to
 * `node_modules/eslint-plugin-react/lib/util/version.js`.
 *
 * Run automatically via the `postinstall` script in `package.json`.
 * Idempotent — re-running on an already-patched file is a no-op.
 *
 * Why this exists:
 *   ESLint 10 replaced `context.getFilename()` (a method) with
 *   `context.filename` (a property). The latest stable
 *   `eslint-plugin-react@7.37.5` still calls the old API, so the
 *   rules fail to load under ESLint 10. This shim handles both.
 *   Delete this file + the postinstall hook once
 *   `eslint-plugin-react@8.x` ships and `eslint-config-next` picks
 *   it up.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(
  __dirname,
  "../node_modules/eslint-plugin-react/lib/util/version.js",
);

const OLD = `    const filename = typeof contextOrFilename === 'string' ? contextOrFilename : contextOrFilename.getFilename();`;

const NEW = `    // PATCH: ESLint 10 replaced context.getFilename() with context.filename (a property, not a method).
    // Keep both calls working so the plugin still loads under ESLint 10.
    const filename = typeof contextOrFilename === 'string'
      ? contextOrFilename
      : (typeof contextOrFilename.getFilename === 'function'
          ? contextOrFilename.getFilename()
          : contextOrFilename.filename);`;

const MARKER = "// PATCH: ESLint 10 replaced context.getFilename()";

try {
  const original = await readFile(target, "utf8");
  if (original.includes(MARKER)) {
    console.log("[patch] eslint-plugin-react already patched — skipping.");
    process.exit(0);
  }
  if (!original.includes(OLD)) {
    console.warn(
      "[patch] eslint-plugin-react version.js no longer matches the expected signature.",
    );
    console.warn("        Upstream may have shipped a fix — open an issue and remove this patcher.");
    process.exit(0);
  }
  const patched = original.replace(OLD, NEW);
  await writeFile(target, patched, "utf8");
  console.log("[patch] Applied ESLint 10 compat patch to eslint-plugin-react.");
} catch (err) {
  if (err.code === "ENOENT") {
    console.log("[patch] eslint-plugin-react not installed yet — skipping.");
    process.exit(0);
  }
  throw err;
}
