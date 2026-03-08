import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGET = join(ROOT, "src");
const MARKERS = ["`r`n", "\\r\\n"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.(js|jsx|ts|tsx|mjs|cjs|json|md|css|html|yml|yaml)$/i.test(entry)) continue;
    out.push(full);
  }
  return out;
}

function lineOf(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

const offenders = [];
for (const file of walk(TARGET)) {
  const content = readFileSync(file, "utf8");
  for (const marker of MARKERS) {
    const idx = content.indexOf(marker);
    if (idx !== -1) offenders.push({ file: relative(ROOT, file), marker, line: lineOf(content, idx) });
  }
}

if (offenders.length) {
  console.error("Found forbidden newline escape artifacts:");
  for (const item of offenders) {
    console.error(`- ${item.file}:${item.line} contains ${JSON.stringify(item.marker)}`);
  }
  process.exit(1);
}

console.log("No newline escape artifacts found in src/.");
