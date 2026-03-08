import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGET = join(ROOT, "src");
const LITERAL_PATTERNS = ["`r`n", "\\r\\n"];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (!/\.(js|jsx|ts|tsx|mjs|cjs|json|css|md)$/i.test(entry)) continue;
    acc.push(full);
  }
  return acc;
}

function findLine(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

const offenders = [];
for (const file of walk(TARGET)) {
  const content = readFileSync(file, "utf8");
  for (const marker of LITERAL_PATTERNS) {
    const idx = content.indexOf(marker);
    if (idx === -1) continue;
    offenders.push({ file: relative(ROOT, file), marker, line: findLine(content, idx) });
  }
}

if (offenders.length > 0) {
  console.error("Found forbidden newline escape artifacts:");
  for (const item of offenders) {
    console.error(`- ${item.file}:${item.line} contains ${JSON.stringify(item.marker)}`);
  }
  process.exit(1);
}

console.log("No newline escape artifacts found in src/.");
