import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const packages = Object.entries(lock.packages).filter(([dir, meta]) => dir && !meta.dev);
const files = [];
for (const [dir, meta] of packages) {
  const entries = await readdir(dir);
  const name = dir.split('node_modules/').at(-1);
  for (const entry of entries.filter(n => /^(licen[sc]e|notice)(\.|$)/i.test(n))) {
    const source = path.join(dir, entry);
    const target = name.replaceAll('/', '__') + '__' + entry;
    await writeFile(path.join('docs/licenses', target), await readFile(source));
    files.push(`- ${name}@${meta.version}: [${entry}](licenses/${target})`);
  }
}
await writeFile('docs/THIRD_PARTY_NOTICES.md', '# Third-party notices\n\nInstalled runtime package licenses, copied verbatim. Source artwork and UI compositions in this prototype are custom CSS/SVG; no third-party hero art is included. This document grants no rights to the confidential assignment or previous design.\n\n' + files.join('\n') + '\n');
console.log(`Preserved ${files.length} runtime license/notice files.`);
