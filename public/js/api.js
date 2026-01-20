/**
 * API Client Module
 * Handles all HTTP requests to the backend server.
 */

const API_BASE = '/api';

/**
 * Makes an HTTP request to the API.
 * @param {string} endpoint - The API endpoint.
 * @param {Object} options - Fetch options.
 * @returns {Promise<any>} The response data.
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An error occurred');
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

// ============================================
// Interns API
// ============================================

const InternsAPI = {
    /**
     * Fetches all interns with optional filters.
     * @param {Object} params - Query parameters.
     * @returns {Promise<Array>} List of interns.
     */
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/interns?${queryString}` : '/interns';
        return apiRequest(endpoint);
    },

    /**
     * Fetches a single intern by ID.
     * @param {number} id - The intern ID.
     * @returns {Promise<Object>} The intern data.
     */
    async getById(id) {
        return apiRequest(`/interns/${id}`);
    },

    /**
     * Creates a new intern.
     * @param {Object} data - The intern data.
     * @returns {Promise<Object>} The created intern.
     */
    async create(data) {
        return apiRequest('/interns', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Updates an existing intern.
     * @param {number} id - The intern ID.
     * @param {Object} data - The updated data.
     * @returns {Promise<Object>} The updated intern.
     */
    async update(id, data) {
        return apiRequest(`/interns/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    /**
     * Deletes an intern.
     * @param {number} id - The intern ID.
     * @returns {Promise<Object>} Deletion confirmation.
     */
    async delete(id) {
        return apiRequest(`/interns/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// Projects API
// ============================================

const ProjectsAPI = {
    /**
     * Fetches all projects with optional filters.
     * @param {Object} params - Query parameters.
     * @returns {Promise<Array>} List of projects.
     */
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/projects?${queryString}` : '/projects';
        return apiRequest(endpoint);
    },

    /**
     * Fetches a single project by ID.
     * @param {number} id - The project ID.
     * @returns {Promise<Object>} The project data.
     */
    async getById(id) {
        return apiRequest(`/projects/${id}`);
    },

    /**
     * Creates a new project.
     * @param {Object} data - The project data.
     * @returns {Promise<Object>} The created project.
     */
    async create(data) {
        return apiRequest('/projects', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Updates an existing project.
     * @param {number} id - The project ID.
     * @param {Object} data - The updated data.
     * @returns {Promise<Object>} The updated project.
     */
    async update(id, data) {
        return apiRequest(`/projects/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    /**
     * Deletes a project.
     * @param {number} id - The project ID.
     * @returns {Promise<Object>} Deletion confirmation.
     */
    async delete(id) {
        return apiRequest(`/projects/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// Tasks API
// ============================================

const TasksAPI = {
    /**
     * Fetches all tasks with optional filters.
     * @param {Object} params - Query parameters.
     * @returns {Promise<Array>} List of tasks.
     */
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';
        return apiRequest(endpoint);
    },

    /**
     * Creates a new task.
     * @param {Object} data - The task data.
     * @returns {Promise<Object>} The created task.
     */
    async create(data) {
        return apiRequest('/tasks', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Updates an existing task.
     * @param {number} id - The task ID.
     * @param {Object} data - The updated data.
     * @returns {Promise<Object>} The updated task.
     */
    async update(id, data) {
        return apiRequest(`/tasks/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    /**
     * Deletes a task.
     * @param {number} id - The task ID.
     * @returns {Promise<Object>} Deletion confirmation.
     */
    async delete(id) {
        return apiRequest(`/tasks/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// Events API
// ============================================

const EventsAPI = {
    /**
     * Fetches all events with optional filters.
     * @param {Object} params - Query parameters.
     * @returns {Promise<Array>} List of events.
     */
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/events?${queryString}` : '/events';
        return apiRequest(endpoint);
    },

    /**
     * Creates a new event.
     * @param {Object} data - The event data.
     * @returns {Promise<Object>} The created event.
     */
    async create(data) {
        return apiRequest('/events', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Updates an existing event.
     * @param {number} id - The event ID.
     * @param {Object} data - The updated data.
     * @returns {Promise<Object>} The updated event.
     */
    async update(id, data) {
        return apiRequest(`/events/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    /**
     * Deletes an event.
     * @param {number} id - The event ID.
     * @param {Object} options - Deletion options.
     * @param {boolean} options.deleteAll - If true, deletes all recurring events in the series.
     * @returns {Promise<Object>} Deletion confirmation.
     */
    async delete(id, options = {}) {
        const queryParams = options.deleteAll ? '?deleteAll=true' : '';
        return apiRequest(`/events/${id}${queryParams}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// Reports API
// ============================================

const ReportsAPI = {
    /**
     * Fetches all weekly reports with optional filters.
     * @param {Object} params - Query parameters.
     * @returns {Promise<Array>} List of reports.
     */
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/reports?${queryString}` : '/reports';
        return apiRequest(endpoint);
    },

    /**
     * Creates a new weekly report.
     * @param {Object} data - The report data.
     * @returns {Promise<Object>} The created report.
     */
    async create(data) {
        return apiRequest('/reports', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Updates an existing report.
     * @param {number} id - The report ID.
     * @param {Object} data - The updated data.
     * @returns {Promise<Object>} The updated report.
     */
    async update(id, data) {
        return apiRequest(`/reports/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    /**
     * Deletes a report.
     * @param {number} id - The report ID.
     * @returns {Promise<Object>} Deletion confirmation.
     */
    async delete(id) {
        return apiRequest(`/reports/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// Dashboard API
// ============================================

const DashboardAPI = {
    /**
     * Fetches dashboard statistics.
     * @returns {Promise<Object>} Dashboard stats.
     */
    async getStats() {
        return apiRequest('/dashboard/stats');
    },

    /**
     * Fetches recent activity log.
     * @param {number} limit - Number of activities to fetch.
     * @returns {Promise<Array>} Activity log entries.
     */
    async getActivity(limit = 20) {
        return apiRequest(`/dashboard/activity?limit=${limit}`);
    },

    /**
     * Fetches upcoming deadlines and events.
     * @returns {Promise<Object>} Upcoming items.
     */
    async getUpcoming() {
        return apiRequest('/dashboard/upcoming');
    },

    /**
     * Fetches list of departments.
     * @returns {Promise<Array>} List of department names.
     */
    async getDepartments() {
        return apiRequest('/departments');
    },

    /**
     * Fetches events for the current week (or extended if last day of week).
     * @returns {Promise<Object>} Object with startDate, endDate, and events array.
     */
    async getWeeklyEvents() {
        return apiRequest('/dashboard/weekly-events');
    }
};

// ============================================
// Intern Files API
// ============================================

const InternFilesAPI = {
    /**
     * Fetches all files for an intern.
     * @param {number} internId - The intern ID.
     * @returns {Promise<Array>} List of files.
     */
    async getAll(internId) {
        return apiRequest(`/interns/${internId}/files`);
    },

    /**
     * Uploads a file for an intern.
     * @param {number} internId - The intern ID.
     * @param {File} file - The file to upload.
     * @param {string} description - Optional file description.
     * @returns {Promise<Object>} The uploaded file info.
     */
    async upload(internId, file, description = '') {
        const formData = new FormData();
        formData.append('file', file);
        if (description) {
            formData.append('description', description);
        }

        const response = await fetch(`${API_BASE}/interns/${internId}/files`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }
        return data;
    },

    /**
     * Gets the download URL for a file.
     * @param {number} internId - The intern ID.
     * @param {number} fileId - The file ID.
     * @returns {string} The download URL.
     */
    getDownloadUrl(internId, fileId) {
        return `${API_BASE}/interns/${internId}/files/${fileId}/download`;
    },

    /**
     * Updates a file's description/notes.
     * @param {number} internId - The intern ID.
     * @param {number} fileId - The file ID.
     * @param {Object} data - The update data (description).
     * @returns {Promise<Object>} The updated file.
     */
    async update(internId, fileId, data) {
        return apiRequest(`/interns/${internId}/files/${fileId}`, {
            method: 'PUT',
            body: data
        });
    },

    /**
     * Deletes a file.
     * @param {number} internId - The intern ID.
     * @param {number} fileId - The file ID.
     * @returns {Promise<Object>} Deletion confirmation.
     */
    async delete(internId, fileId) {
        return apiRequest(`/interns/${internId}/files/${fileId}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// Intern Notes API
// ============================================

const InternNotesAPI = {
    /**
     * Fetches all notes for an intern.
     * @param {number} internId - The intern ID.
     * @param {Object} params - Query parameters (date, category).
     * @returns {Promise<Array>} List of notes.
     */
    async getAll(internId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString 
            ? `/interns/${internId}/notes?${queryString}` 
            : `/interns/${internId}/notes`;
        return apiRequest(endpoint);
    },

    /**
     * Creates a new note for an intern.
     * @param {number} internId - The intern ID.
     * @param {Object} data - The note data.
     * @returns {Promise<Object>} The created note.
     */
    async create(internId, data) {
        return apiRequest(`/interns/${internId}/notes`, {
            method: 'POST',
            body: data
        });
    },

    /**
     * Updates an existing note.
     * @param {number} internId - The intern ID.
     * @param {number} noteId - The note ID.
     * @param {Object} data - The updated data.
     * @returns {Promise<Object>} The updated note.
     */
    async update(internId, noteId, data) {
        return apiRequest(`/interns/${internId}/notes/${noteId}`, {
            method: 'PUT',
            body: data
        });
    },

    /**
     * Deletes a note.
     * @param {number} internId - The intern ID.
     * @param {number} noteId - The note ID.
     * @returns {Promise<Object>} Deletion confirmation.
     */
    async delete(internId, noteId) {
        return apiRequest(`/interns/${internId}/notes/${noteId}`, {
            method: 'DELETE'
        });
    }
};

// Export APIs for use in app.js
window.InternsAPI = InternsAPI;
window.ProjectsAPI = ProjectsAPI;
window.TasksAPI = TasksAPI;
window.EventsAPI = EventsAPI;
window.ReportsAPI = ReportsAPI;
window.DashboardAPI = DashboardAPI;
window.InternFilesAPI = InternFilesAPI;
window.InternNotesAPI = InternNotesAPI;

