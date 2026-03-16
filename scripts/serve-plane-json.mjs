#!/usr/bin/env node
/**
 * Serves scripts/plane-sample.json at http://localhost:9000/plane.json
 * so the plane-test layer backend can fetch it. Run in one terminal,
 * then start the app (pnpm dev) and enable the "飞机测试" layer.
 */
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 9000;
const samplePath = join(__dirname, 'plane-sample.json');

const server = createServer((req, res) => {
  if (req.url === '/plane.json' || req.url === '/') {
    try {
      const data = readFileSync(samplePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e.message) }));
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Plane data server: http://localhost:${PORT}/plane.json`);
  console.log('Start the app (pnpm dev) and enable the "飞机测试" layer on the map to verify.');
});
