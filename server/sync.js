/**
 * Google Drive Sync Module
 * Handles OAuth authentication and data sync with Google Drive.
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Scopes required for Google Drive access and user profile
// Using drive.appdata scope to store data in the hidden app folder,
// which is accessible across all devices with the same Google account
const SCOPES = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
];

// File name for the backup in Google Drive
const BACKUP_FILENAME = 'chop-chop-backup.json';
const BACKUP_MIME_TYPE = 'application/json';

// Token storage path
const TOKEN_PATH = path.join(__dirname, '../data/google-token.json');
console.log('Google token path:', TOKEN_PATH);

// Database reference (set during setupSyncRoutes)
let _db = null;

/**
 * Loads Google OAuth credentials from the database settings table.
 * @returns {Object|null} Credentials object {clientId, clientSecret, redirectUri} or null.
 */
function loadCredentialsFromDatabase() {
    if (!_db) return null;
    
    try {
        const result = _db.prepare('SELECT value FROM settings WHERE key = ?').get('google_oauth_credentials');
        if (result && result.value) {
            const credentials = JSON.parse(result.value);
            if (credentials.clientId && credentials.clientSecret) {
                return credentials;
            }
        }
    } catch (error) {
        console.error('Error loading credentials from database:', error);
    }
    return null;
}

/**
 * Saves Google OAuth credentials to the database settings table.
 * @param {Object} credentials - {clientId, clientSecret, redirectUri}
 * @returns {boolean} True if saved successfully.
 */
function saveCredentialsToDatabase(credentials) {
    if (!_db) return false;
    
    try {
        const value = JSON.stringify({
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            redirectUri: credentials.redirectUri || 'http://localhost:3000/api/sync/callback'
        });
        
        _db.prepare(`
            INSERT INTO settings (key, value, updated_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        `).run('google_oauth_credentials', value, value);
        
        return true;
    } catch (error) {
        console.error('Error saving credentials to database:', error);
        return false;
    }
}

/**
 * Deletes Google OAuth credentials from the database.
 * @returns {boolean} True if deleted successfully.
 */
function deleteCredentialsFromDatabase() {
    if (!_db) return false;
    
    try {
        _db.prepare('DELETE FROM settings WHERE key = ?').run('google_oauth_credentials');
        return true;
    } catch (error) {
        console.error('Error deleting credentials from database:', error);
        return false;
    }
}

/**
 * Creates and configures the OAuth2 client.
 * First checks database settings, then falls back to environment variables.
 * @returns {OAuth2Client|null} Configured OAuth2 client or null if credentials missing.
 */
function createOAuth2Client() {
    // First, try to load from database
    const dbCredentials = loadCredentialsFromDatabase();
    
    let clientId, clientSecret, redirectUri;
    
    if (dbCredentials) {
        clientId = dbCredentials.clientId;
        clientSecret = dbCredentials.clientSecret;
        redirectUri = dbCredentials.redirectUri || 'http://localhost:3000/api/sync/callback';
    } else {
        // Fall back to environment variables
        clientId = process.env.GOOGLE_CLIENT_ID;
        clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/sync/callback';
    }

    if (!clientId || !clientSecret) {
        return null;
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Loads saved token from file if it exists.
 * Validates that the token has the required scopes; clears token if scopes don't match.
 * @returns {Object|null} Saved token or null.
 */
function loadSavedToken() {
    try {
        console.log('Looking for token at:', TOKEN_PATH);
        if (fs.existsSync(TOKEN_PATH)) {
            console.log('Token file found, loading...');
            const tokenData = fs.readFileSync(TOKEN_PATH, 'utf8');
            const token = JSON.parse(tokenData);
            
            // Validate token has the required scopes
            if (token.scope) {
                const tokenScopes = token.scope.split(' ');
                const hasAppDataScope = tokenScopes.some(s => s.includes('drive.appdata'));
                
                if (!hasAppDataScope) {
                    console.log('Token missing required drive.appdata scope, clearing old token...');
                    deleteToken();
                    return null;
                }
            }
            
            console.log('Token loaded successfully');
            return token;
        } else {
            console.log('No token file found');
        }
    } catch (error) {
        console.error('Error loading saved token:', error);
    }
    return null;
}

/**
 * Saves token to file.
 * @param {Object} token - The token to save.
 */
function saveToken(token) {
    try {
        const dataDir = path.dirname(TOKEN_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
        console.log('Google token saved successfully to:', TOKEN_PATH);
    } catch (error) {
        console.error('Error saving token:', error);
        throw error; // Re-throw so callback knows it failed
    }
}

/**
 * Deletes the saved token.
 */
function deleteToken() {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            fs.unlinkSync(TOKEN_PATH);
        }
    } catch (error) {
        console.error('Error deleting token:', error);
    }
}

/**
 * Gets an authenticated OAuth2 client if token exists.
 * @returns {OAuth2Client|null} Authenticated client or null.
 */
function getAuthenticatedClient() {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) return null;

    const token = loadSavedToken();
    if (!token) return null;

    oauth2Client.setCredentials(token);
    return oauth2Client;
}

/**
 * Exports all database data to a JSON object.
 * @param {Database} db - The SQLite database instance.
 * @returns {Object} All data from the database.
 */
function exportDatabaseData(db) {
    const data = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        tables: {}
    };

    // Export all tables
    const tables = [
        'interns',
        'intern_files',
        'intern_notes',
        'projects',
        'project_assignments',
        'tasks',
        'events',
        'event_assignments',
        'weekly_reports',
        'settings',
        'activity_log'
    ];

    for (const table of tables) {
        try {
            const rows = db.prepare(`SELECT * FROM ${table}`).all();
            data.tables[table] = rows;
            console.log(`Exported ${table}: ${rows.length} rows`);
        } catch (error) {
            console.error(`Error exporting table ${table}:`, error);
            data.tables[table] = [];
        }
    }

    console.log('Export complete. Tables exported:', Object.keys(data.tables).map(t => `${t}: ${data.tables[t].length}`).join(', '));
    return data;
}

/**
 * Gets the column names for a table from the database.
 * @param {Database} db - The SQLite database instance.
 * @param {string} table - Table name.
 * @returns {string[]} Array of column names.
 */
function getTableColumns(db, table) {
    try {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        return info.map(col => col.name);
    } catch (error) {
        console.error(`Error getting columns for ${table}:`, error);
        return [];
    }
}

/**
 * Imports data from a JSON object into the database.
 * Handles schema differences gracefully by only importing columns that exist in both
 * the backup data and the current database schema.
 * @param {Database} db - The SQLite database instance.
 * @param {Object} data - The data to import.
 * @param {Object} options - Import options.
 * @param {boolean} options.merge - If true, merges with existing data. If false, replaces all data.
 * @returns {Object} Import result with counts.
 */
function importDatabaseData(db, data, options = { merge: false }) {
    const result = {
        success: true,
        imported: {},
        errors: [],
        skipped: {}
    };

    if (!data.tables) {
        result.success = false;
        result.errors.push('Invalid backup format: missing tables');
        return result;
    }

    // Order matters due to foreign key constraints
    const importOrder = [
        'settings',
        'interns',
        'projects',
        'project_assignments',
        'tasks',
        'events',
        'event_assignments',
        'intern_files',
        'intern_notes',
        'weekly_reports',
        'activity_log'
    ];

    // Begin transaction
    const transaction = db.transaction(() => {
        if (!options.merge) {
            // Clear existing data in reverse order (due to foreign keys)
            for (const table of [...importOrder].reverse()) {
                try {
                    db.prepare(`DELETE FROM ${table}`).run();
                    console.log(`Cleared table: ${table}`);
                } catch (error) {
                    // Table might not exist
                    console.log(`Could not clear table ${table}: ${error.message}`);
                }
            }
        }

        // Import each table
        for (const table of importOrder) {
            const rows = data.tables[table];
            if (!rows || !Array.isArray(rows)) {
                console.log(`Skipping ${table}: no data in backup`);
                continue;
            }

            console.log(`Importing ${table}: ${rows.length} rows`);
            result.imported[table] = 0;
            result.skipped[table] = 0;

            // Get valid columns for this table in the current database
            const validColumns = getTableColumns(db, table);
            if (validColumns.length === 0) {
                console.log(`Skipping ${table}: table does not exist in database`);
                result.errors.push(`Table ${table} does not exist in database`);
                continue;
            }

            for (const row of rows) {
                try {
                    // Filter to only columns that exist in current database schema
                    const rowColumns = Object.keys(row);
                    const columns = rowColumns.filter(col => validColumns.includes(col));
                    
                    if (columns.length === 0) {
                        result.skipped[table]++;
                        continue;
                    }

                    const placeholders = columns.map(() => '?').join(', ');
                    const values = columns.map(col => row[col]);

                    if (options.merge) {
                        // Use INSERT OR REPLACE for merge mode
                        const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
                        db.prepare(sql).run(...values);
                    } else {
                        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
                        db.prepare(sql).run(...values);
                    }
                    result.imported[table]++;
                } catch (error) {
                    console.error(`Error importing row into ${table}:`, error.message);
                    result.errors.push(`Error importing ${table} row: ${error.message}`);
                    result.skipped[table]++;
                }
            }
            
            console.log(`Imported ${result.imported[table]} rows into ${table}, skipped ${result.skipped[table]}`);
        }
    });

    try {
        transaction();
    } catch (error) {
        result.success = false;
        result.errors.push(`Transaction failed: ${error.message}`);
        console.error('Import transaction failed:', error);
    }

    return result;
}

/**
 * Finds the backup file in Google Drive's app data folder.
 * The app data folder is a hidden folder that is shared across all devices
 * using the same Google account, making cross-device sync possible.
 * @param {OAuth2Client} auth - Authenticated OAuth2 client.
 * @returns {Promise<Object|null>} File metadata or null if not found.
 */
async function findBackupFile(auth) {
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
        q: `name='${BACKUP_FILENAME}' and trashed=false`,
        fields: 'files(id, name, modifiedTime, size)',
        spaces: 'appDataFolder'
    });

    if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0];
    }
    return null;
}

/**
 * Uploads data to Google Drive's app data folder.
 * Files in appDataFolder are hidden from the user but accessible
 * by the same app across all devices with the same Google account.
 * @param {OAuth2Client} auth - Authenticated OAuth2 client.
 * @param {Object} data - Data to upload.
 * @returns {Promise<Object>} Upload result.
 */
async function uploadToGoogleDrive(auth, data) {
    const drive = google.drive({ version: 'v3', auth });
    const content = JSON.stringify(data, null, 2);

    // Check if file already exists in app data folder
    const existingFile = await findBackupFile(auth);

    let response;
    if (existingFile) {
        // Update existing file
        response = await drive.files.update({
            fileId: existingFile.id,
            media: {
                mimeType: BACKUP_MIME_TYPE,
                body: content
            },
            fields: 'id, name, modifiedTime, size'
        });
    } else {
        // Create new file in app data folder
        response = await drive.files.create({
            requestBody: {
                name: BACKUP_FILENAME,
                mimeType: BACKUP_MIME_TYPE,
                parents: ['appDataFolder']
            },
            media: {
                mimeType: BACKUP_MIME_TYPE,
                body: content
            },
            fields: 'id, name, modifiedTime, size'
        });
    }

    return response.data;
}

/**
 * Downloads backup data from Google Drive.
 * @param {OAuth2Client} auth - Authenticated OAuth2 client.
 * @returns {Promise<Object|null>} Downloaded data or null if not found.
 */
async function downloadFromGoogleDrive(auth) {
    const drive = google.drive({ version: 'v3', auth });

    // Find the backup file
    const file = await findBackupFile(auth);
    if (!file) {
        return null;
    }

    // Download the file content
    const response = await drive.files.get({
        fileId: file.id,
        alt: 'media'
    });

    return response.data;
}

/**
 * Gets user info from Google.
 * @param {OAuth2Client} auth - Authenticated OAuth2 client.
 * @returns {Promise<Object>} User info.
 */
async function getUserInfo(auth) {
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const response = await oauth2.userinfo.get();
    return response.data;
}

/**
 * Sets up sync routes on the Express app.
 * @param {Express} app - Express application instance.
 * @param {Database} db - SQLite database instance.
 */
function setupSyncRoutes(app, db) {
    // Store database reference for credential storage functions
    _db = db;

    /**
     * GET /api/sync/credentials - Get current credentials configuration status.
     * Does not return the actual secrets, just whether they are configured.
     */
    app.get('/api/sync/credentials', (req, res) => {
        try {
            const dbCredentials = loadCredentialsFromDatabase();
            const envConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
            
            res.json({
                configured: !!(dbCredentials || envConfigured),
                source: dbCredentials ? 'database' : (envConfigured ? 'environment' : 'none'),
                clientId: dbCredentials?.clientId ? `${dbCredentials.clientId.substring(0, 20)}...` : null,
                redirectUri: dbCredentials?.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/sync/callback'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/sync/credentials - Save Google OAuth credentials.
     * Body: { clientId, clientSecret, redirectUri (optional) }
     */
    app.post('/api/sync/credentials', (req, res) => {
        try {
            const { clientId, clientSecret, redirectUri } = req.body;
            
            if (!clientId || !clientSecret) {
                return res.status(400).json({ 
                    error: 'Client ID and Client Secret are required' 
                });
            }
            
            // Basic validation
            if (!clientId.includes('.apps.googleusercontent.com')) {
                return res.status(400).json({ 
                    error: 'Invalid Client ID format. It should end with .apps.googleusercontent.com' 
                });
            }
            
            const saved = saveCredentialsToDatabase({
                clientId: clientId.trim(),
                clientSecret: clientSecret.trim(),
                redirectUri: redirectUri?.trim() || 'http://localhost:3000/api/sync/callback'
            });
            
            if (saved) {
                // Clear any existing token since credentials changed
                deleteToken();
                
                res.json({ 
                    success: true, 
                    message: 'Credentials saved successfully. You can now connect to Google Drive.' 
                });
            } else {
                res.status(500).json({ error: 'Failed to save credentials' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * DELETE /api/sync/credentials - Remove saved credentials.
     */
    app.delete('/api/sync/credentials', (req, res) => {
        try {
            deleteToken();
            deleteCredentialsFromDatabase();
            res.json({ 
                success: true, 
                message: 'Credentials removed successfully' 
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/sync/status - Get current sync status and connection info.
     */
    app.get('/api/sync/status', async (req, res) => {
        console.log('=== Checking sync status ===');
        try {
            const oauth2Client = createOAuth2Client();
            
            if (!oauth2Client) {
                console.log('OAuth client not configured');
                return res.json({
                    configured: false,
                    connected: false,
                    message: 'Google OAuth credentials not configured'
                });
            }

            const token = loadSavedToken();
            console.log('Token loaded:', token ? 'yes (has refresh_token: ' + !!token?.refresh_token + ')' : 'no');
            
            if (!token) {
                return res.json({
                    configured: true,
                    connected: false,
                    message: 'Not connected to Google Drive'
                });
            }

            // Token exists - consider connected
            // We'll validate when actually syncing
            oauth2Client.setCredentials(token);
            
            // Try to get additional info but don't fail if we can't
            let userInfo = null;
            let backupFile = null;
            
            try {
                userInfo = await getUserInfo(oauth2Client);
                console.log('User info:', userInfo?.email);
            } catch (e) {
                console.log('Could not get user info:', e.message);
            }
            
            try {
                backupFile = await findBackupFile(oauth2Client);
                console.log('Backup file:', backupFile ? 'found' : 'not found');
            } catch (e) {
                console.log('Could not check backup file:', e.message);
            }
            
            console.log('=== Status: CONNECTED ===');
            res.json({
                configured: true,
                connected: true,
                user: userInfo ? {
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture
                } : null,
                lastBackup: backupFile ? {
                    modifiedTime: backupFile.modifiedTime,
                    size: backupFile.size
                } : null
            });
        } catch (error) {
            console.error('Status check error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/sync/debug - Debug endpoint to check token file.
     */
    app.get('/api/sync/debug', (req, res) => {
        const tokenExists = fs.existsSync(TOKEN_PATH);
        let tokenContent = null;
        if (tokenExists) {
            try {
                const raw = fs.readFileSync(TOKEN_PATH, 'utf8');
                const parsed = JSON.parse(raw);
                tokenContent = {
                    hasAccessToken: !!parsed.access_token,
                    hasRefreshToken: !!parsed.refresh_token,
                    expiryDate: parsed.expiry_date,
                    scope: parsed.scope
                };
            } catch (e) {
                tokenContent = { error: e.message };
            }
        }
        res.json({
            tokenPath: TOKEN_PATH,
            tokenExists,
            tokenContent,
            envConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
        });
    });

    /**
     * GET /api/sync/auth - Start OAuth flow, returns auth URL.
     */
    app.get('/api/sync/auth', (req, res) => {
        try {
            const oauth2Client = createOAuth2Client();
            
            if (!oauth2Client) {
                return res.status(500).json({
                    error: 'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
                });
            }

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
                prompt: 'consent'
            });

            res.json({ authUrl });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/sync/callback - OAuth callback handler.
     */
    app.get('/api/sync/callback', async (req, res) => {
        try {
            const { code, error } = req.query;

            console.log('OAuth callback received, code present:', !!code, 'error:', error);

            if (error) {
                console.error('OAuth error:', error);
                return res.redirect('/?sync_error=' + encodeURIComponent(error));
            }

            if (!code) {
                console.error('No authorization code received');
                return res.redirect('/?sync_error=' + encodeURIComponent('No authorization code received'));
            }

            const oauth2Client = createOAuth2Client();
            if (!oauth2Client) {
                console.error('OAuth client not configured');
                return res.redirect('/?sync_error=' + encodeURIComponent('OAuth not configured'));
            }

            console.log('Exchanging code for tokens...');
            const { tokens } = await oauth2Client.getToken(code);
            console.log('Tokens received, saving...');
            saveToken(tokens);

            console.log('OAuth flow completed successfully');
            res.redirect('/?sync_success=true');
        } catch (error) {
            console.error('OAuth callback error:', error);
            res.redirect('/?sync_error=' + encodeURIComponent(error.message));
        }
    });

    /**
     * POST /api/sync/logout - Disconnect from Google Drive.
     */
    app.post('/api/sync/logout', (req, res) => {
        try {
            deleteToken();
            res.json({ success: true, message: 'Disconnected from Google Drive' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/sync/export - Export data to Google Drive.
     */
    app.post('/api/sync/export', async (req, res) => {
        try {
            const auth = getAuthenticatedClient();
            if (!auth) {
                return res.status(401).json({ error: 'Not connected to Google Drive' });
            }

            // Export database data
            const data = exportDatabaseData(db);
            
            // Upload to Google Drive
            const result = await uploadToGoogleDrive(auth, data);

            res.json({
                success: true,
                message: 'Data exported to Google Drive',
                file: result
            });
        } catch (error) {
            if (error.code === 401) {
                deleteToken();
                return res.status(401).json({ error: 'Session expired, please reconnect' });
            }
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/sync/preview - Preview what would be imported from Google Drive.
     */
    app.get('/api/sync/preview', async (req, res) => {
        try {
            const auth = getAuthenticatedClient();
            if (!auth) {
                return res.status(401).json({ error: 'Not connected to Google Drive' });
            }

            const data = await downloadFromGoogleDrive(auth);
            if (!data) {
                return res.status(404).json({ error: 'No backup found in Google Drive' });
            }

            // Return summary of what would be imported
            const summary = {
                exportedAt: data.exportedAt,
                version: data.version,
                tables: {}
            };

            for (const [table, rows] of Object.entries(data.tables || {})) {
                summary.tables[table] = Array.isArray(rows) ? rows.length : 0;
            }

            res.json(summary);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/sync/import - Import data from Google Drive.
     * Body: { merge: boolean } - If true, merges with existing data. Default: false (replace).
     */
    app.post('/api/sync/import', async (req, res) => {
        try {
            const auth = getAuthenticatedClient();
            if (!auth) {
                return res.status(401).json({ error: 'Not connected to Google Drive' });
            }

            const { merge = false } = req.body;

            // Download from Google Drive
            const data = await downloadFromGoogleDrive(auth);
            if (!data) {
                return res.status(404).json({ error: 'No backup found in Google Drive' });
            }

            // Import into database
            const result = importDatabaseData(db, data, { merge });

            // Log import results
            console.log('Import results:', JSON.stringify(result, null, 2));

            res.json({
                success: result.success,
                message: result.success ? 'Data imported from Google Drive' : 'Import completed with errors',
                imported: result.imported,
                skipped: result.skipped,
                errors: result.errors,
                backupDate: data.exportedAt
            });
        } catch (error) {
            if (error.code === 401) {
                deleteToken();
                return res.status(401).json({ error: 'Session expired, please reconnect' });
            }
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/sync/sync - Bidirectional sync: pull changes from backup, then push local changes.
     * This performs a merge import first (if backup exists), then exports all data.
     */
    app.post('/api/sync/sync', async (req, res) => {
        try {
            const auth = getAuthenticatedClient();
            if (!auth) {
                return res.status(401).json({ error: 'Not connected to Google Drive' });
            }

            const result = {
                pulled: false,
                pushed: false,
                pullResult: null,
                pushResult: null,
                backupExisted: false
            };

            // Step 1: Check for existing backup and pull changes
            console.log('=== Bidirectional Sync: Checking for existing backup ===');
            const existingBackup = await downloadFromGoogleDrive(auth);
            
            if (existingBackup) {
                result.backupExisted = true;
                console.log('Existing backup found, dated:', existingBackup.exportedAt);
                
                // Import with merge mode to preserve local changes while pulling remote changes
                const importResult = importDatabaseData(db, existingBackup, { merge: true });
                result.pulled = importResult.success;
                result.pullResult = {
                    imported: importResult.imported,
                    skipped: importResult.skipped,
                    errors: importResult.errors,
                    backupDate: existingBackup.exportedAt
                };
                console.log('Pull (import) completed:', importResult.success ? 'success' : 'with errors');
            } else {
                console.log('No existing backup found, skipping pull');
            }

            // Step 2: Export (push) current data to backup
            console.log('=== Bidirectional Sync: Pushing local changes ===');
            const exportData = exportDatabaseData(db);
            const uploadResult = await uploadToGoogleDrive(auth, exportData);
            
            result.pushed = true;
            result.pushResult = {
                file: uploadResult,
                exportedAt: exportData.exportedAt
            };
            console.log('Push (export) completed successfully');

            res.json({
                success: true,
                message: result.backupExisted 
                    ? 'Synced: pulled changes from backup, then pushed local changes'
                    : 'Synced: created new backup with local data',
                ...result
            });
        } catch (error) {
            console.error('Bidirectional sync error:', error);
            if (error.code === 401) {
                deleteToken();
                return res.status(401).json({ error: 'Session expired, please reconnect' });
            }
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = {
    setupSyncRoutes,
    createOAuth2Client,
    exportDatabaseData,
    importDatabaseData
};
