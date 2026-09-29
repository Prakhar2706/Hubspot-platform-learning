import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { modules } from '../src/content/modules.mjs';
import { sources, reviewed } from '../src/content/sources.mjs';
import { lessons } from '../src/content/curriculum.mjs';
import { glossary, studyPlan, projectChecklist } from '../src/content/resources.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = { modules, sources, reviewed, lessons, glossary, studyPlan, projectChecklist };
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const metadata = { generated: reviewed, intent: 'Independent plain-English HubSpot learning platform', dataSources: Object.values(sources).map(source => ({ type: 'official-documentation', ...source })), sections: [{ id: 'main', title: 'Interactive learning platform', producerNotes: 'Original course explanations, fictional BrightPath Workshops examples, and simplified simulations. Source review methods are recorded per reference. Edit src/content, then run node scripts/build.mjs. No live HubSpot integration.' }] };
const replacements = {
  METADATA: safeJSON(metadata), DATA: safeJSON(data),
  STYLES: await readFile(path.join(root, 'src/styles.css'), 'utf8'),
  CORE: await readFile(path.join(root, 'src/core.js'), 'utf8'),
  APP: await readFile(path.join(root, 'src/app.js'), 'utf8'),
};
const template = await readFile(path.join(root, 'src/index.html'), 'utf8');
const output = template.replace(/\{\{(METADATA|DATA|STYLES|CORE|APP)\}\}/g, (_, key) => replacements[key]);
await mkdir(path.join(root, 'site'), { recursive: true });
await writeFile(path.join(root, 'site/index.html'), output);
await writeFile(path.join(root, 'site/.nojekyll'), '');
await writeFile(path.join(root, 'index.html'), output);
console.log(`Built ${lessons.length} lessons in ${modules.length} modules: ${(Buffer.byteLength(output) / 1024).toFixed(1)} KB, no runtime dependencies.`);