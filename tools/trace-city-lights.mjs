import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const source = process.argv[2] ?? "../propuestas/hero-montar-pixel.png";
const destination = new URL("../src/components/city-lights.ts", import.meta.url);
const { data } = await sharp(source)
  .resize(640, 360, { kernel: "nearest" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const lights = [];
for (let y = 233; y < 297; y++) {
  for (let x = 0; x < 398; x++) {
    // The left edge of this strip overlaps the CTA in the reference, so start past it.
    const upperTown = x >= 220 && y >= 233 && y <= 253;
    const lowerTown = x < 209 && y >= 271 && y <= 293 && (x < 106 || y < 287);
    if (!upperTown && !lowerTown) continue;
    const pixel = (y * 640 + x) * 3;
    const r = data[pixel], g = data[pixel + 1], b = data[pixel + 2];
    let palette = -1;
    if (r > 180 && g > 117 && r > b * 1.02) palette = 0;
    else if (r > 146 && g > 74 && r > g * 1.16 && r > b * .94) palette = 1;
    else if (r > 131 && g > 43 && r > g * 1.36 && b > 64) palette = 2;
    else if (g > 123 && b > 139 && r < 130) palette = 3;
    if (palette >= 0) lights.push(x, y, palette);
  }
}

const lines = [];
for (let i = 0; i < lights.length; i += 36) lines.push(`  ${lights.slice(i, i + 36).join(", ")},`);
await writeFile(destination, `// Source-traced positions only. The PNG is not loaded by the application.\nexport const cityLights = new Uint16Array([\n${lines.join("\n")}\n]);\n`);
console.log(`${lights.length / 3} city light pixels traced to ${destination.pathname}`);
