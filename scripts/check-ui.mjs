import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

const requiredIds = [
  "form", "question", "provider", "model", "run", "baseline", "guided",
  "analysis", "constitution"
];

for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) {
    throw new Error(`public/index.html is missing required id: ${id}`);
  }
}

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1].trim())
  .filter(Boolean);

if (!scripts.length) {
  throw new Error("No inline application script found in public/index.html");
}

for (const [index, source] of scripts.entries()) {
  new vm.Script(source, { filename: `public/index.html:inline-${index + 1}.js` });
}

console.log(`UI check passed: ${scripts.length} inline script(s) parsed.`);
