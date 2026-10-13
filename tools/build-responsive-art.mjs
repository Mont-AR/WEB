import sharp from "sharp";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const artDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "art");
const sources = [
  "cloud-bank", "mountain-range", "trail",
  "explorer", "explorer-step-a", "explorer-step-b", "explorer-step-c", "explorer-step-d",
  "explorer-walk-idle", "explorer-walk-right", "explorer-walk-left",
];

for (const name of process.argv.length > 2 ? process.argv.slice(2) : sources) {
  const source = resolve(artDir, `${name}.png`);
  const { width } = await sharp(source).metadata();
  if (!width) throw new Error(`Missing dimensions for ${source}`);
  const largeFactor = name === "trail" ? 2.5 : name.startsWith("explorer") ? 1.5 : 2;
  const smallPath = resolve(artDir, `${name}-small.webp`);
  const largePath = resolve(artDir, `${name}-large.webp`);
  await rm(smallPath, { force: true });
  await rm(largePath, { force: true });
  await sharp(source).resize({ width: Math.round(width / 2), kernel: "nearest" }).webp({ lossless: true, effort: 6 }).toFile(smallPath);
  await sharp(source).resize({ width: Math.round(width * largeFactor), kernel: "nearest" }).webp({ lossless: true, effort: 6 }).toFile(largePath);
  console.log(`${name}: ${Math.round(width / 2)} / ${width} / ${Math.round(width * largeFactor)} px`);
}
