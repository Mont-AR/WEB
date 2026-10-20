// Servidor local de vista previa y renderizado.
//   node tools/journey/render-server.mjs           → http://127.0.0.1:4317/
// El HTML codifica el MP4 en el navegador (WebCodecs); este servidor solo guarda en out/
// lo que la página envía a POST /save?name=<archivo>.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "out");
const PORT = Number(process.env.PORT ?? 4317);
const types = { ".html": "text/html; charset=utf-8", ".mp4": "video/mp4", ".png": "image/png", ".json": "application/json" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "POST" && url.pathname === "/save") {
      const name = path.basename(url.searchParams.get("name") ?? "");
      if (!/^[\w.-]+\.(mp4|png|json)$/.test(name)) { res.writeHead(400).end("nombre inválido"); return; }
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      await fs.writeFile(path.join(OUT, name), body);
      console.log(`guardado out/${name} (${(body.length / 1048576).toFixed(2)} MB)`);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, bytes: body.length }));
      return;
    }
    const file = path.join(OUT, path.basename(url.pathname === "/" ? "montar-explorer-journey.html" : url.pathname));
    const data = await fs.readFile(file);
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(data);
  } catch (error) {
    res.writeHead(404).end(String(error.message));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`vista previa: http://127.0.0.1:${PORT}/`));
