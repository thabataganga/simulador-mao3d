import { readFileSync, existsSync } from "node:fs";

const statsPath = "dist/bundle-stats.json";
const threeCoreThreshold = Number(process.env.THREE_CORE_MAX_BYTES || 500000);
const threeExamplesThreshold = Number(process.env.THREE_EXAMPLES_MAX_BYTES || 38000);

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
const threeExamplesSize = threeExamplesChunk?.size ?? 0;

console.log("Top chunks (bytes):");
for (const chunk of topChunks) {
  console.log(`- ${chunk.fileName}: ${chunk.size}`);
}

console.log("\nThree split summary (bytes):");
console.log(`- three-core: ${threeCoreSize}`);
console.log(`- three-examples: ${threeExamplesSize}`);
console.log(`- three-core-threshold: ${threeCoreThreshold}`);
console.log(`- three-examples-threshold: ${threeExamplesThreshold}`);

console.log("\nTop modules (rendered bytes):");
for (const moduleInfo of topModules) {
  console.log(`- ${moduleInfo.renderedLength}: ${moduleInfo.id}`);
}

let hasBudgetFailure = false;
if (threeCoreSize > threeCoreThreshold) {
  console.error(`\nthree-core chunk exceeded threshold: ${threeCoreSize} > ${threeCoreThreshold}`);
  hasBudgetFailure = true;
}
if (threeExamplesSize > threeExamplesThreshold) {
  console.error(`\nthree-examples chunk exceeded threshold: ${threeExamplesSize} > ${threeExamplesThreshold}`);
  hasBudgetFailure = true;
}

if (hasBudgetFailure) process.exit(1);
