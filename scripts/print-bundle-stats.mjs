import { readFileSync, existsSync } from "node:fs";

const statsPath = "dist/bundle-stats.json";

if (!existsSync(statsPath)) {
  console.error(`Bundle stats file not found: ${statsPath}`);
  process.exit(1);
}

const raw = readFileSync(statsPath, "utf8");
const report = JSON.parse(raw);

const topChunks = (report.chunks || []).slice(0, 5);
const topModules = (report.topModules || []).slice(0, 10);

console.log("Top chunks (bytes):");
for (const chunk of topChunks) {
  console.log(`- ${chunk.fileName}: ${chunk.size}`);
}

console.log("\nTop modules (rendered bytes):");
for (const moduleInfo of topModules) {
  console.log(`- ${moduleInfo.renderedLength}: ${moduleInfo.id}`);
}
