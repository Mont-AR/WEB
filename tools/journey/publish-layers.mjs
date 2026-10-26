// Copia las capas del motor a public/journey/ para que la web renderice el recorrido en vivo.
//   node tools/journey/publish-layers.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(ROOT, "..", "..");
const SRC = path.join(ROOT, "layers");
const DEST = path.join(PROJECT, "public", "journey");

const layers = JSON.parse(await fs.readFile(path.join(SRC, "layers.json"), "utf8"));
layers.plateFile = "plate.png";
const files = (await fs.readdir(SRC)).filter((f) => f.endsWith(".png"));

await fs.rm(DEST, { recursive: true, force: true });
await fs.mkdir(DEST, { recursive: true });
let bytes = 0;
for (const f of files) {
  await fs.copyFile(path.join(SRC, f), path.join(DEST, f));
  bytes += (await fs.stat(path.join(DEST, f))).size;
}
await fs.writeFile(path.join(DEST, "layers.json"), JSON.stringify({ ...layers, files }));
console.log(`public/journey: ${files.length} capas (${(bytes / 1048576).toFixed(1)} MB)`);
