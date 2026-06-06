import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { startServer } from '../src/server.mjs';

const require = createRequire(import.meta.url);
const root = process.cwd();
const electronMain = join(root, 'electron', 'main.cjs');
const electronPath = require.resolve('electron');

if (!existsSync(electronMain)) {
  throw new Error(`Missing Electron main file: ${electronMain}`);
}

const handle = await startServer({
  root,
  port: 0,
  token: 'desktop-smoke-token',
  dataDir: join(root, 'artifacts', 'self_test', 'desktop-smoke-data'),
  artifactDir: join(root, 'artifacts', 'self_test', 'desktop-smoke-artifacts')
});

try {
  const html = await fetch(handle.url).then(response => response.text());
  const health = await fetch(`${handle.url}/health`).then(response => response.json());
  const ok = html.includes('.hapaCatalog') && health.ok === true;
  console.log(JSON.stringify({
    ok,
    electron_resolved: electronPath,
    electron_main: electronMain,
    url: handle.url,
    loaded_web_shell: html.includes('.hapaCatalog'),
    health_ok: health.ok === true
  }, null, 2));
  process.exitCode = ok ? 0 : 1;
} finally {
  handle.server.close();
  handle.core.close();
}
