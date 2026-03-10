const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let win;
let selector;
let backend;

function startBackend() {
  backend = spawn("python", ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"], {
    cwd: path.join(__dirname, "../backend"),
    shell: true,
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 440,
    height: 760,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.setContentProtection(true);
  win.loadFile(path.join(__dirname, "src/index.html"));
}

function openSelector() {
  if (selector && !selector.isDestroyed()) {
    selector.close();
    selector = null;
    return;
  }
  const { width, height } = screen.getPrimaryDisplay().bounds;
  selector = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  selector.setContentProtection(true);
  selector.loadFile(path.join(__dirname, "src/selector.html"));
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  ipcMain.on("close-window", () => win.close());

  ipcMain.on("open-selector", () => openSelector());

  ipcMain.on("region-selected", (e, region) => {
    if (selector && !selector.isDestroyed()) {
      selector.close();
      selector = null;
    }
    win.show();
    win.webContents.send("region-selected", region);
  });

  ipcMain.on("selector-cancelled", () => {
    if (selector && !selector.isDestroyed()) {
      selector.close();
      selector = null;
    }
  });

  ipcMain.on("snap-corner", (e, corner) => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const w = 440, h = 760, pad = 12;
    const positions = {
      tl: { x: pad, y: pad },
      tr: { x: width - w - pad, y: pad },
      bl: { x: pad, y: height - h - pad },
      br: { x: width - w - pad, y: height - h - pad },
    };
    win.setPosition(positions[corner].x, positions[corner].y);
  });

  ipcMain.on("set-opacity", (e, val) => win.setOpacity(val));

  globalShortcut.register("CommandOrControl+Shift+H", () => {
    win.isVisible() ? win.hide() : win.show();
  });

  globalShortcut.register("CommandOrControl+Shift+S", () => {
    win.show();
    win.webContents.send("snap-and-analyze");
  });

  globalShortcut.register("CommandOrControl+Shift+R", () => {
    win.show();
    openSelector();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (backend) backend.kill();
});
