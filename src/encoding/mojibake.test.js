import fs from "fs";
import path from "path";
import { cwd } from "node:process";

const FILES = [
  "src/App.jsx",
  "src/components/ThumbPanel.jsx",
  "src/three/buildHandRig.js",
  "src/hooks/useHandRig.js",
];

const MOJIBAKE = /Ã.|Â.|�|â€”|â€“|â€œ|â€|Â°/;

describe("UTF-8 text integrity", () => {
  test("UI-facing files do not contain common mojibake sequences", () => {
    for (const rel of FILES) {
      const full = path.resolve(cwd(), rel);
      const text = fs.readFileSync(full, "utf8");
      expect(MOJIBAKE.test(text)).toBe(false);
    }
  });
});
