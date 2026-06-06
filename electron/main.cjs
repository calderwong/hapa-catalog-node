const { app, BrowserWindow } = require('electron');
const path = require('node:path');

let serverHandle;

async function main() {
  if (process.env.HAPA_CATALOG_DESKTOP_SMOKE === '1') {
    setTimeout(() => {
      app.quit();
    }, 3000).unref();
  }
  const modulePath = path.join(__dirname, '..', 'src', 'server.mjs');
  const { startServer } = await import(`file://${modulePath}`);
  serverHandle = await startServer();
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: '.hapaCatalog',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await win.loadURL(serverHandle.url);
}

app.whenReady().then(main);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  if (serverHandle?.server) serverHandle.server.close();
  if (serverHandle?.core) serverHandle.core.close();
});
