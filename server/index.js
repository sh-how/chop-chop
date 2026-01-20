/**
 * Intern Manager Server
 * Express server with SQLite database for managing interns, projects, and schedules.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const multer = require('multer');

const app = express();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const internDir = path.join(uploadsDir, req.params.id);
        if (!fs.existsSync(internDir)) {
            fs.mkdirSync(internDir, { recursive: true });
        }
        cb(null, internDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (ext) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});
const DEFAULT_PORT = process.env.PORT || 3000;
const MAX_PORT_ATTEMPTS = 10;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// Database Setup
// ============================================

const db = new Database(path.join(__dirname, '../data/intern_manager.db'));

/**
 * Initializes the database schema.
 */
function initializeDatabase() {
    // Create interns table
    db.exec(`
        CREATE TABLE IF NOT EXISTS interns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            department TEXT,
            role TEXT,
            university TEXT,
            start_date TEXT,
            end_date TEXT,
            status TEXT DEFAULT 'active',
            notes TEXT,
            avatar_color TEXT,
            traits TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Add traits column if it doesn't exist (for existing databases)
    try {
        db.exec('ALTER TABLE interns ADD COLUMN traits TEXT');
    } catch (e) {
        // Column already exists, ignore error
    }

    // Create intern_files table for file attachments
    db.exec(`
        CREATE TABLE IF NOT EXISTS intern_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intern_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            description TEXT,
            uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
        )
    `);

    // Create intern_notes table for dated notes
    db.exec(`
        CREATE TABLE IF NOT EXISTS intern_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intern_id INTEGER NOT NULL,
            note_date TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
        )
    `);

    // Create projects table
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            progress INTEGER DEFAULT 0,
            start_date TEXT,
            due_date TEXT,
            completed_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create project_assignments table (many-to-many relationship)
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            intern_id INTEGER NOT NULL,
            role TEXT DEFAULT 'contributor',
            is_lead INTEGER DEFAULT 0,
            assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
            UNIQUE(project_id, intern_id)
        )
    `);
    
    // Add is_lead column if it doesn't exist (migration for existing databases)
    try {
        db.exec('ALTER TABLE project_assignments ADD COLUMN is_lead INTEGER DEFAULT 0');
    } catch (e) {
        // Column already exists, ignore
    }

    // Create tasks table
    db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            intern_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            due_date TEXT,
            completed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
            FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE SET NULL
        )
    `);

    // Create events table
    db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            event_type TEXT DEFAULT 'meeting',
            event_date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            location TEXT,
            intern_id INTEGER,
            project_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE SET NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        )
    `);

    // Create event_assignments table (many-to-many relationship for events and interns)
    db.exec(`
        CREATE TABLE IF NOT EXISTS event_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            intern_id INTEGER NOT NULL,
            assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
            UNIQUE(event_id, intern_id)
        )
    `);

    // Add color and recurrence columns to events table (migration for existing databases)
    try {
        db.exec('ALTER TABLE events ADD COLUMN color TEXT DEFAULT "#6366f1"');
    } catch (e) {
        // Column already exists, ignore
    }
    try {
        db.exec('ALTER TABLE events ADD COLUMN recurrence_type TEXT DEFAULT "none"');
    } catch (e) {
        // Column already exists, ignore
    }
    try {
        db.exec('ALTER TABLE events ADD COLUMN recurrence_count INTEGER DEFAULT 1');
    } catch (e) {
        // Column already exists, ignore
    }
    try {
        db.exec('ALTER TABLE events ADD COLUMN recurrence_parent_id INTEGER');
    } catch (e) {
        // Column already exists, ignore
    }

    // Create activity_log table
    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            entity_name TEXT,
            details TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create weekly_reports table
    db.exec(`
        CREATE TABLE IF NOT EXISTS weekly_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intern_id INTEGER NOT NULL,
            week_start TEXT NOT NULL,
            week_end TEXT NOT NULL,
            accomplishments TEXT,
            challenges TEXT,
            next_week_goals TEXT,
            hours_worked REAL,
            supervisor_feedback TEXT,
            rating INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
        )
    `);

    // Create settings table for storing app configuration
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Initialize default traits if not exists
    const existingTraits = db.prepare('SELECT value FROM settings WHERE key = ?').get('intern_traits');
    if (!existingTraits) {
        const defaultTraits = [
            { key: 'technical', label: 'Technical Skills', abbr: 'TEC', description: 'Technical ability & code quality' },
            { key: 'communication', label: 'Communication', abbr: 'COM', description: 'Verbal & written communication' },
            { key: 'initiative', label: 'Initiative', abbr: 'INI', description: 'Proactiveness & self-direction' },
            { key: 'reliability', label: 'Reliability', abbr: 'REL', description: 'Punctuality & meeting deadlines' },
            { key: 'quality', label: 'Quality', abbr: 'QUA', description: 'Quality of work output' },
            { key: 'teamwork', label: 'Teamwork', abbr: 'TEA', description: 'Collaboration with others' }
        ];
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('intern_traits', JSON.stringify(defaultTraits));
    }

    console.log('Database initialized successfully');
}

/**
 * Logs an activity to the activity_log table.
 * @param {string} action - The action performed.
 * @param {string} entityType - The type of entity affected.
 * @param {number} entityId - The ID of the entity.
 * @param {string} entityName - The name of the entity.
 * @param {string} details - Additional details.
 */
function logActivity(action, entityType, entityId, entityName, details = null) {
    const stmt = db.prepare(`
        INSERT INTO activity_log (action, entity_type, entity_id, entity_name, details)
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(action, entityType, entityId, entityName, details);
}

// Initialize database
initializeDatabase();

// ============================================
// API Routes - Interns
// ============================================

/**
 * GET /api/interns - Get all interns with optional filters.
 */
app.get('/api/interns', (req, res) => {
    try {
        const { status, department, search } = req.query;
        let query = 'SELECT * FROM interns WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (department) {
            query += ' AND department = ?';
            params.push(department);
        }
        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR role LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC';
        const interns = db.prepare(query).all(...params);
        // Parse contact fields for all interns
        interns.forEach(intern => {
            intern.email = parseContactField(intern.email);
            intern.phone = parseContactField(intern.phone);
        });
        res.json(interns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/interns/:id - Get a single intern by ID.
 */
app.get('/api/interns/:id', (req, res) => {
    try {
        const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(req.params.id);
        if (!intern) {
            return res.status(404).json({ error: 'Intern not found' });
        }

        // Parse contact fields
        intern.email = parseContactField(intern.email);
        intern.phone = parseContactField(intern.phone);

        // Parse traits JSON
        if (intern.traits) {
            try {
                intern.traits = JSON.parse(intern.traits);
            } catch (e) {
                intern.traits = {};
            }
        } else {
            intern.traits = {};
        }

        // Get assigned projects
        const projects = db.prepare(`
            SELECT p.*, pa.role as assignment_role 
            FROM projects p
            JOIN project_assignments pa ON p.id = pa.project_id
            WHERE pa.intern_id = ?
        `).all(req.params.id);

        // Get tasks
        const tasks = db.prepare('SELECT * FROM tasks WHERE intern_id = ?').all(req.params.id);

        // Get weekly reports
        const reports = db.prepare('SELECT * FROM weekly_reports WHERE intern_id = ? ORDER BY week_start DESC').all(req.params.id);

        res.json({ ...intern, projects, tasks, reports });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Normalizes email/phone input to JSON array string for storage.
 * Accepts: string, array, or null/undefined.
 * @param {string|Array|null} value - Input value.
 * @returns {string|null} JSON array string or null.
 */
function normalizeContactField(value) {
    if (!value) return null;
    if (Array.isArray(value)) {
        // Filter out empty strings
        const filtered = value.filter(v => v && v.trim());
        return filtered.length > 0 ? JSON.stringify(filtered) : null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? JSON.stringify([trimmed]) : null;
    }
    return null;
}

/**
 * Parses stored contact field (email/phone) for API response.
 * @param {string|null} value - Stored JSON string.
 * @returns {Array} Array of contact values.
 */
function parseContactField(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
        // Legacy single value, wrap in array
        return value.trim() ? [value] : [];
    }
}

/**
 * POST /api/interns - Create a new intern.
 */
app.post('/api/interns', (req, res) => {
    try {
        const { name, email, phone, department, role, university, start_date, end_date, status, notes } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Generate a random avatar color
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6'];
        const avatar_color = colors[Math.floor(Math.random() * colors.length)];

        // Normalize email and phone to JSON arrays
        const normalizedEmail = normalizeContactField(email);
        const normalizedPhone = normalizeContactField(phone);

        const stmt = db.prepare(`
            INSERT INTO interns (name, email, phone, department, role, university, start_date, end_date, status, notes, avatar_color)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(name, normalizedEmail, normalizedPhone, department, role, university, start_date, end_date, status || 'active', notes, avatar_color);
        
        logActivity('created', 'intern', result.lastInsertRowid, name);
        
        const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(result.lastInsertRowid);
        // Parse contact fields for response
        intern.email = parseContactField(intern.email);
        intern.phone = parseContactField(intern.phone);
        res.status(201).json(intern);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/interns/:id - Update an intern.
 */
app.put('/api/interns/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM interns WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Intern not found' });
        }

        // Support partial updates by merging with existing data
        const { name, email, phone, department, role, university, start_date, end_date, status, notes, traits } = req.body;
        
        const updatedName = name !== undefined ? name : existing.name;
        // Normalize email and phone to JSON arrays when provided
        const updatedEmail = email !== undefined ? normalizeContactField(email) : existing.email;
        const updatedPhone = phone !== undefined ? normalizeContactField(phone) : existing.phone;
        const updatedDepartment = department !== undefined ? department : existing.department;
        const updatedRole = role !== undefined ? role : existing.role;
        const updatedUniversity = university !== undefined ? university : existing.university;
        const updatedStartDate = start_date !== undefined ? start_date : existing.start_date;
        const updatedEndDate = end_date !== undefined ? end_date : existing.end_date;
        const updatedStatus = status !== undefined ? status : existing.status;
        const updatedNotes = notes !== undefined ? notes : existing.notes;
        const updatedTraits = traits !== undefined ? JSON.stringify(traits) : existing.traits;

        const stmt = db.prepare(`
            UPDATE interns 
            SET name = ?, email = ?, phone = ?, department = ?, role = ?, university = ?, 
                start_date = ?, end_date = ?, status = ?, notes = ?, traits = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.run(updatedName, updatedEmail, updatedPhone, updatedDepartment, updatedRole, updatedUniversity, 
                 updatedStartDate, updatedEndDate, updatedStatus, updatedNotes, updatedTraits, req.params.id);
        
        logActivity('updated', 'intern', req.params.id, updatedName);
        
        const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(req.params.id);
        // Parse contact fields for response
        intern.email = parseContactField(intern.email);
        intern.phone = parseContactField(intern.phone);
        // Parse traits JSON for response
        if (intern.traits) {
            try {
                intern.traits = JSON.parse(intern.traits);
            } catch (e) {
                // Keep as string if not valid JSON
            }
        }
        res.json(intern);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/interns/:id - Delete an intern.
 */
app.delete('/api/interns/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM interns WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Intern not found' });
        }

        // Delete associated files from filesystem
        const internDir = path.join(__dirname, '../uploads', req.params.id);
        if (fs.existsSync(internDir)) {
            fs.rmSync(internDir, { recursive: true, force: true });
        }

        db.prepare('DELETE FROM interns WHERE id = ?').run(req.params.id);
        
        logActivity('deleted', 'intern', req.params.id, existing.name);
        
        res.json({ message: 'Intern deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API Routes - Intern Files
// ============================================

/**
 * GET /api/interns/:id/files - Get all files for an intern.
 */
app.get('/api/interns/:id/files', (req, res) => {
    try {
        const files = db.prepare(`
            SELECT * FROM intern_files 
            WHERE intern_id = ? 
            ORDER BY uploaded_at DESC
        `).all(req.params.id);
        
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/interns/:id/files - Upload a file for an intern.
 */
app.post('/api/interns/:id/files', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(req.params.id);
        if (!intern) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Intern not found' });
        }

        const { description } = req.body;
        const fileType = path.extname(req.file.originalname).toLowerCase().slice(1);

        const stmt = db.prepare(`
            INSERT INTO intern_files (intern_id, filename, original_name, file_type, file_size, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            req.params.id,
            req.file.filename,
            req.file.originalname,
            fileType,
            req.file.size,
            description || null
        );

        logActivity('uploaded', 'file', result.lastInsertRowid, `${req.file.originalname} for ${intern.name}`);

        const file = db.prepare('SELECT * FROM intern_files WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(file);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/interns/:id/files/:fileId/download - Download a file.
 */
app.get('/api/interns/:id/files/:fileId/download', (req, res) => {
    try {
        const file = db.prepare(`
            SELECT * FROM intern_files 
            WHERE id = ? AND intern_id = ?
        `).get(req.params.fileId, req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(__dirname, '../uploads', req.params.id, file.filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        res.download(filePath, file.original_name);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/interns/:id/files/:fileId - Update a file's description/notes.
 */
app.put('/api/interns/:id/files/:fileId', (req, res) => {
    try {
        const { description } = req.body;

        const existing = db.prepare(`
            SELECT * FROM intern_files 
            WHERE id = ? AND intern_id = ?
        `).get(req.params.fileId, req.params.id);

        if (!existing) {
            return res.status(404).json({ error: 'File not found' });
        }

        db.prepare(`
            UPDATE intern_files 
            SET description = ?
            WHERE id = ?
        `).run(description || null, req.params.fileId);

        const file = db.prepare('SELECT * FROM intern_files WHERE id = ?').get(req.params.fileId);
        res.json(file);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/interns/:id/files/:fileId - Delete a file.
 */
app.delete('/api/interns/:id/files/:fileId', (req, res) => {
    try {
        const file = db.prepare(`
            SELECT * FROM intern_files 
            WHERE id = ? AND intern_id = ?
        `).get(req.params.fileId, req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete from filesystem
        const filePath = path.join(__dirname, '../uploads', req.params.id, file.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        db.prepare('DELETE FROM intern_files WHERE id = ?').run(req.params.fileId);

        logActivity('deleted', 'file', req.params.fileId, file.original_name);

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API Routes - Intern Notes
// ============================================

/**
 * GET /api/interns/:id/notes - Get all notes for an intern.
 */
app.get('/api/interns/:id/notes', (req, res) => {
    try {
        const { date, category } = req.query;
        let query = 'SELECT * FROM intern_notes WHERE intern_id = ?';
        const params = [req.params.id];

        if (date) {
            query += ' AND note_date = ?';
            params.push(date);
        }
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY note_date DESC, created_at DESC';

        const notes = db.prepare(query).all(...params);
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/interns/:id/notes - Create a note for an intern.
 */
app.post('/api/interns/:id/notes', (req, res) => {
    try {
        const { note_date, title, content, category } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Note content is required' });
        }

        const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(req.params.id);
        if (!intern) {
            return res.status(404).json({ error: 'Intern not found' });
        }

        const stmt = db.prepare(`
            INSERT INTO intern_notes (intern_id, note_date, title, content, category)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            req.params.id,
            note_date || new Date().toISOString().split('T')[0],
            title || null,
            content,
            category || 'general'
        );

        logActivity('created', 'note', result.lastInsertRowid, `Note for ${intern.name}`);

        const note = db.prepare('SELECT * FROM intern_notes WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/interns/:id/notes/:noteId - Update a note.
 */
app.put('/api/interns/:id/notes/:noteId', (req, res) => {
    try {
        const { note_date, title, content, category } = req.body;

        const existing = db.prepare(`
            SELECT * FROM intern_notes 
            WHERE id = ? AND intern_id = ?
        `).get(req.params.noteId, req.params.id);

        if (!existing) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const stmt = db.prepare(`
            UPDATE intern_notes 
            SET note_date = ?, title = ?, content = ?, category = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(
            note_date || existing.note_date,
            title !== undefined ? title : existing.title,
            content || existing.content,
            category || existing.category,
            req.params.noteId
        );

        const note = db.prepare('SELECT * FROM intern_notes WHERE id = ?').get(req.params.noteId);
        res.json(note);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/interns/:id/notes/:noteId - Delete a note.
 */
app.delete('/api/interns/:id/notes/:noteId', (req, res) => {
    try {
        const existing = db.prepare(`
            SELECT * FROM intern_notes 
            WHERE id = ? AND intern_id = ?
        `).get(req.params.noteId, req.params.id);

        if (!existing) {
            return res.status(404).json({ error: 'Note not found' });
        }

        db.prepare('DELETE FROM intern_notes WHERE id = ?').run(req.params.noteId);

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API Routes - Projects
// ============================================

/**
 * GET /api/projects - Get all projects with optional filters.
 */
app.get('/api/projects', (req, res) => {
    try {
        const { status, priority, search } = req.query;
        let query = 'SELECT * FROM projects WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (priority) {
            query += ' AND priority = ?';
            params.push(priority);
        }
        if (search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC';
        const projects = db.prepare(query).all(...params);

        // Get assigned interns for each project
        const projectsWithInterns = projects.map(project => {
            const interns = db.prepare(`
                SELECT i.id, i.name, i.avatar_color, pa.role as assignment_role, pa.is_lead
                FROM interns i
                JOIN project_assignments pa ON i.id = pa.intern_id
                WHERE pa.project_id = ?
                ORDER BY pa.is_lead DESC, i.name ASC
            `).all(project.id);
            return { ...project, assigned_interns: interns };
        });

        res.json(projectsWithInterns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:id - Get a single project by ID.
 */
app.get('/api/projects/:id', (req, res) => {
    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get assigned interns (lead first)
        const interns = db.prepare(`
            SELECT i.*, pa.role as assignment_role, pa.is_lead
            FROM interns i
            JOIN project_assignments pa ON i.id = pa.intern_id
            WHERE pa.project_id = ?
            ORDER BY pa.is_lead DESC, i.name ASC
        `).all(req.params.id);

        // Get tasks
        const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(req.params.id);

        res.json({ ...project, assigned_interns: interns, tasks });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects - Create a new project.
 */
app.post('/api/projects', (req, res) => {
    try {
        const { name, description, status, priority, progress, start_date, due_date, intern_ids, lead_id } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const stmt = db.prepare(`
            INSERT INTO projects (name, description, status, priority, progress, start_date, due_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(name, description, status || 'pending', priority || 'medium', progress || 0, start_date, due_date);
        const projectId = result.lastInsertRowid;

        // Assign interns if provided
        if (intern_ids && intern_ids.length > 0) {
            const assignStmt = db.prepare('INSERT INTO project_assignments (project_id, intern_id, is_lead) VALUES (?, ?, ?)');
            intern_ids.forEach(internId => {
                const isLead = lead_id && internId === lead_id ? 1 : 0;
                assignStmt.run(projectId, internId, isLead);
            });
        }

        logActivity('created', 'project', projectId, name);
        
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/projects/:id - Update a project.
 */
app.put('/api/projects/:id', (req, res) => {
    try {
        const { name, description, status, priority, progress, start_date, due_date, intern_ids, lead_id } = req.body;
        
        const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Set completed_date if status changed to completed
        let completed_date = existing.completed_date;
        if (status === 'completed' && existing.status !== 'completed') {
            completed_date = new Date().toISOString().split('T')[0];
        } else if (status !== 'completed') {
            completed_date = null;
        }

        const stmt = db.prepare(`
            UPDATE projects 
            SET name = ?, description = ?, status = ?, priority = ?, progress = ?, 
                start_date = ?, due_date = ?, completed_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.run(name, description, status, priority, progress, start_date, due_date, completed_date, req.params.id);

        // Update intern assignments if provided
        if (intern_ids !== undefined) {
            db.prepare('DELETE FROM project_assignments WHERE project_id = ?').run(req.params.id);
            if (intern_ids.length > 0) {
                const assignStmt = db.prepare('INSERT INTO project_assignments (project_id, intern_id, is_lead) VALUES (?, ?, ?)');
                intern_ids.forEach(internId => {
                    const isLead = lead_id && internId === lead_id ? 1 : 0;
                    assignStmt.run(req.params.id, internId, isLead);
                });
            }
        }

        logActivity('updated', 'project', req.params.id, name);
        
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/projects/:id - Delete a project.
 */
app.delete('/api/projects/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Project not found' });
        }

        db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
        
        logActivity('deleted', 'project', req.params.id, existing.name);
        
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API Routes - Tasks
// ============================================

/**
 * GET /api/tasks - Get all tasks with optional filters.
 */
app.get('/api/tasks', (req, res) => {
    try {
        const { status, intern_id, project_id } = req.query;
        let query = `
            SELECT t.*, i.name as intern_name, p.name as project_name
            FROM tasks t
            LEFT JOIN interns i ON t.intern_id = i.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        if (intern_id) {
            query += ' AND t.intern_id = ?';
            params.push(intern_id);
        }
        if (project_id) {
            query += ' AND t.project_id = ?';
            params.push(project_id);
        }

        query += ' ORDER BY t.due_date ASC, t.created_at DESC';
        const tasks = db.prepare(query).all(...params);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tasks - Create a new task.
 */
app.post('/api/tasks', (req, res) => {
    try {
        const { title, description, status, priority, due_date, intern_id, project_id } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Task title is required' });
        }

        const stmt = db.prepare(`
            INSERT INTO tasks (title, description, status, priority, due_date, intern_id, project_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(title, description, status || 'pending', priority || 'medium', due_date, intern_id, project_id);
        
        logActivity('created', 'task', result.lastInsertRowid, title);
        
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/tasks/:id - Update a task.
 */
app.put('/api/tasks/:id', (req, res) => {
    try {
        const { title, description, status, priority, due_date, intern_id, project_id } = req.body;
        
        const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Task not found' });
        }

        let completed_at = existing.completed_at;
        if (status === 'completed' && existing.status !== 'completed') {
            completed_at = new Date().toISOString();
        } else if (status !== 'completed') {
            completed_at = null;
        }

        const stmt = db.prepare(`
            UPDATE tasks 
            SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, 
                intern_id = ?, project_id = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.run(title, description, status, priority, due_date, intern_id, project_id, completed_at, req.params.id);
        
        logActivity('updated', 'task', req.params.id, title);
        
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/tasks/:id - Delete a task.
 */
app.delete('/api/tasks/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Task not found' });
        }

        db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
        
        logActivity('deleted', 'task', req.params.id, existing.title);
        
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API Routes - Events
// ============================================

/**
 * GET /api/events - Get all events with optional filters.
 */
app.get('/api/events', (req, res) => {
    try {
        const { start_date, end_date, intern_id, event_type } = req.query;
        let query = `
            SELECT e.*, p.name as project_name
            FROM events e
            LEFT JOIN projects p ON e.project_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            query += ' AND e.event_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND e.event_date <= ?';
            params.push(end_date);
        }
        if (intern_id) {
            // Filter events that have this intern assigned
            query += ' AND e.id IN (SELECT event_id FROM event_assignments WHERE intern_id = ?)';
            params.push(intern_id);
        }
        if (event_type) {
            query += ' AND e.event_type = ?';
            params.push(event_type);
        }

        query += ' ORDER BY e.event_date ASC, e.start_time ASC';
        const events = db.prepare(query).all(...params);
        
        // Get assigned interns for each event
        const eventsWithInterns = events.map(event => {
            const assigned_interns = db.prepare(`
                SELECT i.id, i.name, i.avatar_color
                FROM interns i
                JOIN event_assignments ea ON i.id = ea.intern_id
                WHERE ea.event_id = ?
                ORDER BY i.name ASC
            `).all(event.id);
            
            // For backward compatibility, also include intern_name from first assigned intern
            const intern_name = assigned_interns.length > 0 ? assigned_interns[0].name : null;
            
            return { ...event, assigned_interns, intern_name };
        });
        
        res.json(eventsWithInterns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/events - Create a new event (supports recurring events).
 */
app.post('/api/events', (req, res) => {
    try {
        const { 
            title, description, event_type, event_date, start_time, end_time, 
            location, intern_ids, project_id, color, recurrence_type, recurrence_count 
        } = req.body;
        
        if (!title || !event_date) {
            return res.status(400).json({ error: 'Title and event date are required' });
        }

        const eventColor = color || '#6366f1';
        const recType = recurrence_type || 'none';
        const recCount = parseInt(recurrence_count) || 1;
        
        const createdEvents = [];
        let parentEventId = null;
        
        // Calculate dates for recurring events
        const dates = [event_date];
        if (recType !== 'none' && recCount > 1) {
            const startDate = new Date(event_date);
            for (let i = 1; i < recCount; i++) {
                const nextDate = new Date(startDate);
                if (recType === 'daily') {
                    nextDate.setDate(startDate.getDate() + i);
                } else if (recType === 'weekly') {
                    nextDate.setDate(startDate.getDate() + (i * 7));
                } else if (recType === 'biweekly') {
                    nextDate.setDate(startDate.getDate() + (i * 14));
                } else if (recType === 'monthly') {
                    nextDate.setMonth(startDate.getMonth() + i);
                }
                dates.push(nextDate.toISOString().split('T')[0]);
            }
        }
        
        // Create all events
        const stmt = db.prepare(`
            INSERT INTO events (title, description, event_type, event_date, start_time, end_time, location, project_id, color, recurrence_type, recurrence_count, recurrence_parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const assignStmt = db.prepare('INSERT INTO event_assignments (event_id, intern_id) VALUES (?, ?)');
        
        dates.forEach((date, index) => {
            const result = stmt.run(
                title, description, event_type || 'meeting', date, start_time, end_time, 
                location, project_id, eventColor, recType, recCount, parentEventId
            );
            const eventId = result.lastInsertRowid;
            
            // First event becomes the parent
            if (index === 0) {
                parentEventId = eventId;
            } else {
                // Update recurrence_parent_id for non-first events
                db.prepare('UPDATE events SET recurrence_parent_id = ? WHERE id = ?').run(parentEventId, eventId);
            }
            
            // Assign interns if provided
            if (intern_ids && intern_ids.length > 0) {
                intern_ids.forEach(internId => {
                    assignStmt.run(eventId, internId);
                });
            }
            
            createdEvents.push(eventId);
        });
        
        logActivity('created', 'event', parentEventId, title + (recCount > 1 ? ` (${recCount} occurrences)` : ''));
        
        // Get the first event with assigned interns
        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(parentEventId);
        const assigned_interns = db.prepare(`
            SELECT i.id, i.name, i.avatar_color
            FROM interns i
            JOIN event_assignments ea ON i.id = ea.intern_id
            WHERE ea.event_id = ?
        `).all(parentEventId);
        
        res.status(201).json({ 
            ...event, 
            assigned_interns,
            created_count: createdEvents.length,
            created_event_ids: createdEvents
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/events/:id - Update an event.
 */
app.put('/api/events/:id', (req, res) => {
    try {
        const { title, description, event_type, event_date, start_time, end_time, location, intern_ids, project_id, color } = req.body;
        
        const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const stmt = db.prepare(`
            UPDATE events 
            SET title = ?, description = ?, event_type = ?, event_date = ?, start_time = ?, 
                end_time = ?, location = ?, project_id = ?, color = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.run(title, description, event_type, event_date, start_time, end_time, location, project_id, color || existing.color, req.params.id);
        
        // Update intern assignments if provided
        if (intern_ids !== undefined) {
            db.prepare('DELETE FROM event_assignments WHERE event_id = ?').run(req.params.id);
            if (intern_ids.length > 0) {
                const assignStmt = db.prepare('INSERT INTO event_assignments (event_id, intern_id) VALUES (?, ?)');
                intern_ids.forEach(internId => {
                    assignStmt.run(req.params.id, internId);
                });
            }
        }
        
        logActivity('updated', 'event', req.params.id, title);
        
        // Get the event with assigned interns
        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
        const assigned_interns = db.prepare(`
            SELECT i.id, i.name, i.avatar_color
            FROM interns i
            JOIN event_assignments ea ON i.id = ea.intern_id
            WHERE ea.event_id = ?
        `).all(req.params.id);
        
        res.json({ ...event, assigned_interns });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/events/:id - Delete an event.
 * Query params:
 *   - deleteAll: 'true' to delete all recurring events in the series
 */
app.delete('/api/events/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const deleteAll = req.query.deleteAll === 'true';
        let deletedCount = 1;

        if (deleteAll && (existing.recurrence_parent_id || existing.recurrence_type !== 'none')) {
            // This event is part of a recurring series
            // Find the parent ID (either this event is the parent, or it has a parent)
            const parentId = existing.recurrence_parent_id || existing.id;
            
            // Delete all events in the series (parent and all children)
            const result = db.prepare(`
                DELETE FROM events 
                WHERE id = ? OR recurrence_parent_id = ?
            `).run(parentId, parentId);
            
            deletedCount = result.changes;
            logActivity('deleted', 'event', parentId, `${existing.title} (${deletedCount} recurring events)`);
        } else {
            // Delete only this specific event
            db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
            logActivity('deleted', 'event', req.params.id, existing.title);
        }
        
        res.json({ 
            message: deleteAll ? `Deleted ${deletedCount} recurring events` : 'Event deleted successfully',
            deleted_count: deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API Routes - Weekly Reports
// ============================================

/**
 * GET /api/reports - Get all weekly reports.
 */
app.get('/api/reports', (req, res) => {
    try {
        const { intern_id } = req.query;
        let query = `
            SELECT r.*, i.name as intern_name
            FROM weekly_reports r
            JOIN interns i ON r.intern_id = i.id
            WHERE 1=1
        `;
        const params = [];

        if (intern_id) {
            query += ' AND r.intern_id = ?';
            params.push(intern_id);
        }

        query += ' ORDER BY r.week_start DESC';
        const reports = db.prepare(query).all(...params);
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/reports - Create a new weekly report.
 */
app.post('/api/reports', (req, res) => {
    try {
        const { intern_id, week_start, week_end, accomplishments, challenges, next_week_goals, hours_worked, supervisor_feedback, rating } = req.body;
        
        if (!intern_id || !week_start || !week_end) {
            return res.status(400).json({ error: 'Intern ID, week start, and week end are required' });
        }

        const stmt = db.prepare(`
            INSERT INTO weekly_reports (intern_id, week_start, week_end, accomplishments, challenges, next_week_goals, hours_worked, supervisor_feedback, rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(intern_id, week_start, week_end, accomplishments, challenges, next_week_goals, hours_worked, supervisor_feedback, rating);
        
        const intern = db.prepare('SELECT name FROM interns WHERE id = ?').get(intern_id);
        logActivity('created', 'report', result.lastInsertRowid, `Weekly report for ${intern?.name}`);
        
        const report = db.prepare('SELECT * FROM weekly_reports WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/reports/:id - Update a weekly report.
 */
app.put('/api/reports/:id', (req, res) => {
    try {
        const { accomplishments, challenges, next_week_goals, hours_worked, supervisor_feedback, rating } = req.body;
        
        const existing = db.prepare('SELECT * FROM weekly_reports WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const stmt = db.prepare(`
            UPDATE weekly_reports 
            SET accomplishments = ?, challenges = ?, next_week_goals = ?, hours_worked = ?, 
                supervisor_feedback = ?, rating = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.run(accomplishments, challenges, next_week_goals, hours_worked, supervisor_feedback, rating, req.params.id);
        
        const report = db.prepare('SELECT * FROM weekly_reports WHERE id = ?').get(req.params.id);
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/reports/:id - Delete a weekly report.
 */
app.delete('/api/reports/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM weekly_reports WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Report not found' });
        }

        db.prepare('DELETE FROM weekly_reports WHERE id = ?').run(req.params.id);
        
        res.json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API Routes - Dashboard & Statistics
// ============================================

/**
 * GET /api/dashboard/stats - Get dashboard statistics.
 */
app.get('/api/dashboard/stats', (req, res) => {
    try {
        const stats = {
            interns: {
                total: db.prepare('SELECT COUNT(*) as count FROM interns').get().count,
                active: db.prepare("SELECT COUNT(*) as count FROM interns WHERE status = 'active'").get().count,
                completed: db.prepare("SELECT COUNT(*) as count FROM interns WHERE status = 'completed'").get().count
            },
            projects: {
                total: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
                active: db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'").get().count,
                completed: db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'completed'").get().count,
                pending: db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'pending'").get().count,
                onhold: db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'onhold'").get().count
            },
            tasks: {
                total: db.prepare('SELECT COUNT(*) as count FROM tasks').get().count,
                completed: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get().count,
                pending: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'").get().count,
                in_progress: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'").get().count
            },
            events: {
                upcoming: getWeeklyEventsCount(db)
            }
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Calculates the date range for upcoming weekly events.
 * If today is the last day of the week (Sunday), extend to next week.
 * @returns {Object} Object with startDate and endDate strings (YYYY-MM-DD).
 */
function getWeeklyEventDateRange() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Start date is always today
    const startDate = today.toISOString().split('T')[0];
    
    // Calculate end of current week (Sunday)
    const daysUntilSunday = 7 - dayOfWeek;
    let endDate = new Date(today);
    endDate.setDate(today.getDate() + daysUntilSunday);
    
    // If today is the last day of the week (Sunday), extend to next week
    if (dayOfWeek === 0) {
        endDate.setDate(endDate.getDate() + 7);
    }
    
    return {
        startDate,
        endDate: endDate.toISOString().split('T')[0]
    };
}

/**
 * Gets the count of events for the current week.
 * @param {Object} db - Database instance.
 * @returns {number} Count of upcoming weekly events.
 */
function getWeeklyEventsCount(db) {
    const { startDate, endDate } = getWeeklyEventDateRange();
    return db.prepare(`
        SELECT COUNT(*) as count FROM events 
        WHERE event_date >= ? AND event_date <= ?
    `).get(startDate, endDate).count;
}

/**
 * GET /api/dashboard/weekly-events - Get list of events for the current week.
 */
app.get('/api/dashboard/weekly-events', (req, res) => {
    try {
        const { startDate, endDate } = getWeeklyEventDateRange();
        
        const events = db.prepare(`
            SELECT 
                e.id,
                e.title,
                e.description,
                e.event_type,
                e.event_date,
                e.start_time,
                e.end_time,
                e.location,
                e.color,
                e.project_id,
                p.name as project_name
            FROM events e
            LEFT JOIN projects p ON e.project_id = p.id
            WHERE e.event_date >= ? AND e.event_date <= ?
            ORDER BY e.event_date ASC, e.start_time ASC
        `).all(startDate, endDate);
        
        // Get assigned interns for each event
        const eventsWithInterns = events.map(event => {
            const assignedInterns = db.prepare(`
                SELECT i.id, i.name, i.avatar_color
                FROM interns i
                JOIN event_assignments ea ON i.id = ea.intern_id
                WHERE ea.event_id = ?
            `).all(event.id);
            
            return { ...event, assigned_interns: assignedInterns };
        });
        
        res.json({
            startDate,
            endDate,
            events: eventsWithInterns
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/activity - Get recent activity log.
 */
app.get('/api/dashboard/activity', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const activities = db.prepare(`
            SELECT * FROM activity_log 
            ORDER BY created_at DESC 
            LIMIT ?
        `).all(limit);
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/upcoming - Get upcoming deadlines and events.
 */
app.get('/api/dashboard/upcoming', (req, res) => {
    try {
        const upcomingProjects = db.prepare(`
            SELECT id, name, due_date, status, priority, 'project' as type
            FROM projects 
            WHERE due_date >= date('now') AND status != 'completed'
            ORDER BY due_date ASC
            LIMIT 5
        `).all();

        const upcomingTasks = db.prepare(`
            SELECT t.id, t.title as name, t.due_date, t.status, t.priority, 'task' as type, i.name as intern_name
            FROM tasks t
            LEFT JOIN interns i ON t.intern_id = i.id
            WHERE t.due_date >= date('now') AND t.status != 'completed'
            ORDER BY t.due_date ASC
            LIMIT 5
        `).all();

        const upcomingEvents = db.prepare(`
            SELECT e.id, e.title as name, e.event_date as due_date, e.event_type, 'event' as type, i.name as intern_name
            FROM events e
            LEFT JOIN interns i ON e.intern_id = i.id
            WHERE e.event_date >= date('now')
            ORDER BY e.event_date ASC
            LIMIT 5
        `).all();

        res.json({
            projects: upcomingProjects,
            tasks: upcomingTasks,
            events: upcomingEvents
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/departments - Get list of unique departments.
 */
app.get('/api/departments', (req, res) => {
    try {
        const departments = db.prepare(`
            SELECT DISTINCT department FROM interns 
            WHERE department IS NOT NULL AND department != ''
            ORDER BY department
        `).all();
        res.json(departments.map(d => d.department));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API Routes - Traits Management
// ============================================

/**
 * GET /api/traits - Get all trait definitions.
 */
app.get('/api/traits', (req, res) => {
    try {
        const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('intern_traits');
        const traits = result ? JSON.parse(result.value) : [];
        res.json(traits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/traits - Add a new trait.
 */
app.post('/api/traits', (req, res) => {
    try {
        const { key, label, abbr, description } = req.body;
        
        if (!key || !label || !abbr) {
            return res.status(400).json({ error: 'Key, label, and abbreviation are required' });
        }

        // Get current traits
        const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('intern_traits');
        const traits = result ? JSON.parse(result.value) : [];

        // Check if key already exists
        if (traits.some(t => t.key === key)) {
            return res.status(400).json({ error: 'A trait with this key already exists' });
        }

        // Check if abbreviation already exists
        if (traits.some(t => t.abbr.toUpperCase() === abbr.toUpperCase())) {
            return res.status(400).json({ error: 'A trait with this abbreviation already exists' });
        }

        // Add new trait
        const newTrait = {
            key: key.toLowerCase().replace(/\s+/g, '_'),
            label,
            abbr: abbr.toUpperCase().slice(0, 3),
            description: description || ''
        };
        traits.push(newTrait);

        // Save updated traits
        db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
            .run(JSON.stringify(traits), 'intern_traits');

        logActivity('created', 'trait', null, label, `Added new trait: ${label} (${abbr})`);
        res.status(201).json(newTrait);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/traits/:key - Update a trait.
 */
app.put('/api/traits/:key', (req, res) => {
    try {
        const { key } = req.params;
        const { label, abbr, description } = req.body;

        // Get current traits
        const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('intern_traits');
        const traits = result ? JSON.parse(result.value) : [];

        // Find trait index
        const traitIndex = traits.findIndex(t => t.key === key);
        if (traitIndex === -1) {
            return res.status(404).json({ error: 'Trait not found' });
        }

        // Update trait
        if (label) traits[traitIndex].label = label;
        if (abbr) traits[traitIndex].abbr = abbr.toUpperCase().slice(0, 3);
        if (description !== undefined) traits[traitIndex].description = description;

        // Save updated traits
        db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
            .run(JSON.stringify(traits), 'intern_traits');

        logActivity('updated', 'trait', null, traits[traitIndex].label, `Updated trait: ${traits[traitIndex].label}`);
        res.json(traits[traitIndex]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/traits/:key - Delete a trait.
 */
app.delete('/api/traits/:key', (req, res) => {
    try {
        const { key } = req.params;

        // Get current traits
        const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('intern_traits');
        const traits = result ? JSON.parse(result.value) : [];

        // Find trait
        const trait = traits.find(t => t.key === key);
        if (!trait) {
            return res.status(404).json({ error: 'Trait not found' });
        }

        // Remove trait
        const updatedTraits = traits.filter(t => t.key !== key);

        // Save updated traits
        db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
            .run(JSON.stringify(updatedTraits), 'intern_traits');

        // Remove this trait from all interns
        const interns = db.prepare('SELECT id, traits FROM interns').all();
        for (const intern of interns) {
            if (intern.traits) {
                try {
                    const internTraits = JSON.parse(intern.traits);
                    delete internTraits[key];
                    db.prepare('UPDATE interns SET traits = ? WHERE id = ?')
                        .run(JSON.stringify(internTraits), intern.id);
                } catch (e) {
                    // Skip if traits is not valid JSON
                }
            }
        }

        logActivity('deleted', 'trait', null, trait.label, `Deleted trait: ${trait.label}`);
        res.json({ message: 'Trait deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/traits/:key/reorder - Reorder a trait to a new position.
 */
app.put('/api/traits/:key/reorder', (req, res) => {
    try {
        const { key } = req.params;
        const { newIndex } = req.body;

        if (typeof newIndex !== 'number' || newIndex < 0) {
            return res.status(400).json({ error: 'Invalid new index' });
        }

        // Get current traits
        const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('intern_traits');
        const traits = result ? JSON.parse(result.value) : [];

        // Find current index
        const currentIndex = traits.findIndex(t => t.key === key);
        if (currentIndex === -1) {
            return res.status(404).json({ error: 'Trait not found' });
        }

        // Clamp newIndex to valid range
        const clampedIndex = Math.min(newIndex, traits.length - 1);

        // Remove trait from current position and insert at new position
        const [trait] = traits.splice(currentIndex, 1);
        traits.splice(clampedIndex, 0, trait);

        // Save updated traits
        db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
            .run(JSON.stringify(traits), 'intern_traits');

        logActivity('reordered', 'trait', null, trait.label, `Moved trait "${trait.label}" to position ${clampedIndex + 1}`);
        res.json(traits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Serve Frontend
// ============================================

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============================================
// Start Server
// ============================================

/**
 * Attempts to start the server on the given port.
 * If the port is in use, tries the next port up to MAX_PORT_ATTEMPTS times.
 * @param {number} port - The port to try.
 * @param {number} attempt - Current attempt number.
 */
function startServer(port, attempt = 1) {
    const server = app.listen(port)
        .on('listening', () => {
            console.log(`Intern Manager server running at http://localhost:${port}`);
        })
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                if (attempt < MAX_PORT_ATTEMPTS) {
                    console.log(`Port ${port} is in use, trying port ${port + 1}...`);
                    startServer(port + 1, attempt + 1);
                } else {
                    console.error(`Could not find an available port after ${MAX_PORT_ATTEMPTS} attempts.`);
                    process.exit(1);
                }
            } else {
                console.error('Server error:', err);
                process.exit(1);
            }
        });

    // Graceful shutdown
    process.on('SIGINT', () => {
        server.close();
        db.close();
        process.exit();
    });
}

startServer(DEFAULT_PORT);

