import { writeFileSync } from "node:fs";

const commit = String(process.env.GITHUB_SHA || "").trim();
if (!/^[0-9a-f]{40}$/i.test(commit)) {
  throw new Error("GITHUB_SHA must be a 40-character commit SHA");
}

const release = Object.freeze({
  commit,
  deployedAt: new Date().toISOString(),
});

writeFileSync("Public/release.json", JSON.stringify(release));
writeFileSync(
  "functions/api/release.js",
  `const RELEASE = Object.freeze(${JSON.stringify(release)});\n\nexport async function onRequestGet() {\n  return new Response(JSON.stringify(RELEASE), {\n    headers: {\n      "content-type": "application/json; charset=utf-8",\n      "cache-control": "no-store, no-cache, must-revalidate",\n      pragma: "no-cache",\n      "x-robots-tag": "noindex",\n    },\n  });\n}\n`,
);

console.log(`Stamped HOPE release ${commit}`);
