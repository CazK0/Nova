const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let win;
let backend;

function startBackend() {
  backend = spawn("uvicorn", ["main:app", "--host", "127.0.0.1", "--port", "8000"], {
    cwd: path.join(__dirname, "../backend"),
    shell: true,
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 700,
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

app.whenReady().then(() => {
  startBackend();
  createWindow();

  ipcMain.on("close-window", () => win.close());

  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }
  });

  globalShortcut.register("CommandOrControl+Shift+S", () => {
    win.show();
    win.webContents.send("snap-and-analyze");
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (backend) backend.kill();
});
