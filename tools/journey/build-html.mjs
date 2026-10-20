// Genera out/montar-explorer-journey.html: un único archivo autocontenido con el motor,
// las capas PNG (sin pérdida) y la línea de tiempo compartida con la web.
//   node tools/journey/build-html.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(ROOT, "..", "..");
const layers = JSON.parse(await fs.readFile(path.join(ROOT, "layers", "layers.json"), "utf8"));
const timeline = JSON.parse(await fs.readFile(path.join(PROJECT, "src", "lib", "journey-timeline.json"), "utf8"));
layers.plateFile = "plate.png";

const files = (await fs.readdir(path.join(ROOT, "layers"))).filter(f => f.endsWith(".png"));
const images = {};
for (const f of files) images[f] = `data:image/png;base64,${(await fs.readFile(path.join(ROOT, "layers", f))).toString("base64")}`;

const template = await fs.readFile(path.join(ROOT, "engine.html"), "utf8");
const html = template.replace("/*__ASSETS__*/", () => JSON.stringify({ timeline, layers, images }));
await fs.mkdir(path.join(PROJECT, "out"), { recursive: true });
const target = path.join(PROJECT, "out", "montar-explorer-journey.html");
await fs.writeFile(target, html);
console.log(`${path.relative(PROJECT, target)} (${(html.length / 1048576).toFixed(1)} MB, ${files.length} capas)`);
