import { readFileSync, existsSync } from "node:fs";

const statsPath = "dist/bundle-stats.json";
const threeCoreThreshold = Number(process.env.THREE_CORE_MAX_BYTES || 500000);

if (!existsSync(statsPath)) {
  console.error(`Bundle stats file not found: ${statsPath}`);
  process.exit(1);
}

const raw = readFileSync(statsPath, "utf8");
const report = JSON.parse(raw);

const chunks = report.chunks || [];
const topChunks = chunks.slice(0, 5);
const topModules = (report.topModules || []).slice(0, 10);

const threeCoreChunk = chunks.find(chunk => chunk.fileName.includes("three-core"));
const threeExamplesChunk = chunks.find(chunk => chunk.fileName.includes("three-examples"));
const threeCoreSize = threeCoreChunk?.size ?? 0;

console.log("Top chunks (bytes):");
for (const chunk of topChunks) {
  console.log(`- ${chunk.fileName}: ${chunk.size}`);
}

console.log("\nThree split summary (bytes):");
console.log(`- three-core: ${threeCoreSize}`);
console.log(`- three-examples: ${threeExamplesChunk?.size ?? 0}`);
console.log(`- three-core-threshold: ${threeCoreThreshold}`);

console.log("\nTop modules (rendered bytes):");
for (const moduleInfo of topModules) {
  console.log(`- ${moduleInfo.renderedLength}: ${moduleInfo.id}`);
}

if (threeCoreSize > threeCoreThreshold) {
  console.error(`\nthree-core chunk exceeded threshold: ${threeCoreSize} > ${threeCoreThreshold}`);
  process.exit(1);
}
