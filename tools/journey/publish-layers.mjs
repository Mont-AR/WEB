// Copia las capas del motor a public/journey/ para que la web renderice el recorrido en vivo.
//   node tools/journey/publish-layers.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(ROOT, "..", "..");
const SRC = path.join(ROOT, "layers");
const DEST = path.join(PROJECT, "public", "journey");

const layers = JSON.parse(await fs.readFile(path.join(SRC, "layers.json"), "utf8"));
// La placa es la mitad del peso: en la web va en WebP (sin diferencia visible con el PNG).
layers.plateFile = "plate.webp";
const pngs = (await fs.readdir(SRC)).filter((f) => f.endsWith(".png") && f !== "plate.png");
const files = [...pngs, layers.plateFile];

await fs.rm(DEST, { recursive: true, force: true });
await fs.mkdir(DEST, { recursive: true });
let bytes = 0;
await sharp(path.join(SRC, "plate.png")).webp({ quality: 92, effort: 6 }).toFile(path.join(DEST, layers.plateFile));
bytes += (await fs.stat(path.join(DEST, layers.plateFile))).size;
for (const f of pngs) {
  await fs.copyFile(path.join(SRC, f), path.join(DEST, f));
  bytes += (await fs.stat(path.join(DEST, f))).size;
}
await fs.writeFile(path.join(DEST, "layers.json"), JSON.stringify({ ...layers, files }));
console.log(`public/journey: ${files.length} capas (${(bytes / 1048576).toFixed(1)} MB)`);
