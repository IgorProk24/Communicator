// Builds the browser-only version for GitHub Pages into ../docs (repo root).
// Same UI as public/, but Claude and OpenRouter are called straight from the browser
// with keys the viewer enters on their own device.
import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, '..', 'docs');
await mkdir(out, { recursive: true });

await build({
  entryPoints: [path.join(root, 'pages/direct.js')],
  outfile: path.join(out, 'engine.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  logLevel: 'warning',
});

for (const f of ['app.js', 'styles.css', 'catalog.js']) await copyFile(path.join(root, 'public', f), path.join(out, f));

const html = await readFile(path.join(root, 'public/index.html'), 'utf8');
const marker = '<script type="module" src="app.js"></script>';
if (!html.includes(marker)) throw new Error('index.html: app.js script tag not found');
await writeFile(path.join(out, 'index.html'), html.replace(marker, `<script type="module" src="engine.js"></script>\n  ${marker}`));
await writeFile(path.join(out, '.nojekyll'), '');
console.log('GitHub Pages build →', out);
