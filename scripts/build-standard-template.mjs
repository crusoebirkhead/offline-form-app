/**
 * Bundles @formio/standard-template into a single IIFE script that can be
 * loaded in the WebView alongside formio.form.min.js.
 *
 * The output registers the standard-template with BOOTSTRAP_EXAMPLE classes
 * under the "gryphon" framework name, matching the desktop Next.js app.
 *
 * Usage: node scripts/build-standard-template.mjs
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const outfile = resolve(root, 'assets/webview/assets/formio-standard-template.js');

await build({
  entryPoints: [resolve(root, 'scripts/standard-template-entry.js')],
  bundle: true,
  format: 'iife',
  globalName: 'FormioStandardTemplate',
  outfile,
  minify: true,
  target: ['es2020'],
});

// -----------------------------------------------------------------------------
// Patch an upstream typo in @formio/standard-template's datagrid template.
// lib/templates/datagrid/form.js emits the remove-row button ref as
// `${datagridKey}}-removeRow` (note the stray `}`), so the rendered DOM ref
// (`datagrid-<key>}-removeRow`) never matches the ref Form.io core looks up
// (`datagrid-<key>-removeRow`). The click handler is therefore never bound and
// the Remove button silently does nothing. Correct the doubled brace so remove
// works. Verified with scripts/verify (2 rows -> click Remove -> 1 row).
// NOTE: the WebView loads the `.js.txt` copy of this file (Metro treats .txt as
// a string asset); after rebuilding, copy the output to
// assets/webview/assets/formio-standard-template.js.txt.
// -----------------------------------------------------------------------------
const built = readFileSync(outfile, 'utf8');
const patched = built.split('}}-removeRow').join('}-removeRow');
if (patched !== built) {
  writeFileSync(outfile, patched);
  console.log('✓ Patched removeRow ref typo (upstream @formio/standard-template bug)');
} else {
  console.warn('⚠ removeRow ref typo not found — upstream may have fixed it; verify remove-row still works');
}

console.log('✓ Built assets/webview/assets/formio-standard-template.js');
