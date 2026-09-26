import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reference = resolve(root, "..", "propuestas", "hero-montar-pixel.png");

// Coordinates are in the 1672 × 941 reference. Keep the pixels unscaled so
// the foliage retains the exact colors and stepped silhouette of the source.
const cutouts = [
  {
    file: "trail-bush-main.png",
    left: 885, top: 670, width: 205, height: 145,
    points: "0,92 7,86 17,86 17,71 27,69 31,59 40,59 44,49 54,44 58,35 69,34 75,27 86,25 90,20 99,20 104,17 121,17 126,20 140,20 146,28 153,29 159,34 166,35 171,42 180,46 187,52 195,56 200,64 205,69 205,97 190,102 179,104 168,109 151,111 138,114 126,117 109,121 97,122 82,127 65,128 50,133 34,133 20,138 0,138",
  },
];

for (const { file, left, top, width, height, points } of cutouts) {
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polygon points="${points}" fill="white" shape-rendering="crispEdges"/></svg>`);
  await sharp(reference)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(resolve(root, "public", "art", file));
}
