const { app, BrowserWindow } = require('electron');
const path = require('path');

// Spin up our server.cjs in production format
function startBackend() {
  try {
    // Run the bundled Express server
    require('./dist/server.cjs');
    console.log('Backend server started successfully in Electron context on port 3000');
  } catch (err) {
    console.error('Error starting server.cjs inside Electron:', err);
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    title: "ブラック・ジャック | Blackjack Classic",
    autoHideMenuBar: true,
    backgroundColor: '#073b1c',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load local port 3000 where our express app is running
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  // Brief timeout to ensure Express is fully bound and ready
  setTimeout(createWindow, 800);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
