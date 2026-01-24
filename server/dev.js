/**
 * Development Server with Hot Reload
 * 
 * Features:
 * - Auto-restarts server when backend files change
 * - Auto-refreshes browser when frontend files change
 * - WebSocket-based live reload for instant updates
 * 
 * Usage: npm run dev
 */

const { spawn } = require('child_process');
const path = require('path');
const chokidar = require('chokidar');
const WebSocket = require('ws');

// Configuration
const SERVER_FILE = path.join(__dirname, 'index.js');
const WATCH_DIRS = {
    server: [path.join(__dirname, '**/*.js')],
    client: [
        path.join(__dirname, '../public/**/*.js'),
        path.join(__dirname, '../public/**/*.css'),
        path.join(__dirname, '../public/**/*.html')
    ]
};
const LIVE_RELOAD_PORT = 35729;
const DEBOUNCE_MS = 300;

// State
let serverProcess = null;
let wss = null;
let restartTimeout = null;
let reloadTimeout = null;

/**
 * Starts the main application server as a child process.
 */
function startServer() {
    console.log('\x1b[36m[dev]\x1b[0m Starting server...');
    
    serverProcess = spawn('node', [SERVER_FILE], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'development' }
    });

    serverProcess.on('error', (err) => {
        console.error('\x1b[31m[dev]\x1b[0m Server error:', err.message);
    });

    serverProcess.on('exit', (code, signal) => {
        if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
            console.log(`\x1b[33m[dev]\x1b[0m Server exited with code ${code}`);
        }
        serverProcess = null;
    });
}

/**
 * Stops the running server process.
 * @returns {Promise} Resolves when server is stopped.
 */
function stopServer() {
    return new Promise((resolve) => {
        if (!serverProcess) {
            resolve();
            return;
        }

        serverProcess.once('exit', () => {
            serverProcess = null;
            resolve();
        });

        serverProcess.kill('SIGTERM');
        
        // Force kill after timeout
        setTimeout(() => {
            if (serverProcess) {
                serverProcess.kill('SIGKILL');
            }
        }, 3000);
    });
}

/**
 * Restarts the server (debounced).
 */
function restartServer() {
    if (restartTimeout) {
        clearTimeout(restartTimeout);
    }
    
    restartTimeout = setTimeout(async () => {
        console.log('\x1b[36m[dev]\x1b[0m Server file changed, restarting...');
        await stopServer();
        startServer();
        
        // Notify browsers to reload after server restart
        setTimeout(() => notifyBrowsers('reload'), 1000);
    }, DEBOUNCE_MS);
}

/**
 * Starts the WebSocket server for live reload communication.
 */
function startLiveReloadServer() {
    wss = new WebSocket.Server({ port: LIVE_RELOAD_PORT });
    
    wss.on('listening', () => {
        console.log(`\x1b[32m[dev]\x1b[0m Live reload server running on port ${LIVE_RELOAD_PORT}`);
    });

    wss.on('connection', (ws) => {
        console.log('\x1b[32m[dev]\x1b[0m Browser connected for live reload');
        ws.send(JSON.stringify({ type: 'connected' }));
    });

    wss.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`\x1b[33m[dev]\x1b[0m Live reload port ${LIVE_RELOAD_PORT} in use, trying next...`);
            wss = new WebSocket.Server({ port: LIVE_RELOAD_PORT + 1 });
        } else {
            console.error('\x1b[31m[dev]\x1b[0m WebSocket error:', err.message);
        }
    });
}

/**
 * Notifies all connected browsers to perform an action.
 * @param {string} action - The action to perform ('reload' or 'refreshcss').
 */
function notifyBrowsers(action) {
    if (!wss) return;
    
    const message = JSON.stringify({ type: action });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Triggers a browser reload (debounced).
 * @param {string} filePath - Path of the changed file.
 */
function triggerReload(filePath) {
    if (reloadTimeout) {
        clearTimeout(reloadTimeout);
    }
    
    reloadTimeout = setTimeout(() => {
        const ext = path.extname(filePath);
        const fileName = path.basename(filePath);
        
        if (ext === '.css') {
            console.log(`\x1b[35m[dev]\x1b[0m CSS changed: ${fileName} - refreshing styles`);
            notifyBrowsers('refreshcss');
        } else {
            console.log(`\x1b[35m[dev]\x1b[0m File changed: ${fileName} - reloading browser`);
            notifyBrowsers('reload');
        }
    }, DEBOUNCE_MS);
}

/**
 * Sets up file watchers for server and client files.
 */
function setupWatchers() {
    // Watch server files - restart on change
    const serverWatcher = chokidar.watch(WATCH_DIRS.server, {
        ignored: [/node_modules/, /dev\.js$/],
        persistent: true,
        ignoreInitial: true
    });

    serverWatcher.on('change', (filePath) => {
        console.log(`\x1b[36m[dev]\x1b[0m Server file changed: ${path.basename(filePath)}`);
        restartServer();
    });

    // Watch client files - reload browser on change
    const clientWatcher = chokidar.watch(WATCH_DIRS.client, {
        ignored: /node_modules/,
        persistent: true,
        ignoreInitial: true
    });

    clientWatcher.on('change', triggerReload);
    clientWatcher.on('add', triggerReload);

    console.log('\x1b[32m[dev]\x1b[0m Watching for file changes...');
}

/**
 * Graceful shutdown handler.
 */
async function shutdown() {
    console.log('\n\x1b[36m[dev]\x1b[0m Shutting down...');
    
    if (wss) {
        wss.close();
    }
    
    await stopServer();
    process.exit(0);
}

// Handle termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Main entry point
console.log('\x1b[32m[dev]\x1b[0m Starting development environment...');
console.log('\x1b[32m[dev]\x1b[0m ================================');
startLiveReloadServer();
setupWatchers();
startServer();
