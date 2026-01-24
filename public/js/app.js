/**
 * Intern Manager Application
 * Main application logic for the frontend.
 */

// ============================================
// Application State
// ============================================

const AppState = {
    currentView: 'dashboard',
    interns: [],
    projects: [],
    tasks: [],
    events: [],
    reports: [],
    selectedDate: new Date(),
    calendarDate: new Date()
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    sidebar: document.getElementById('sidebar'),
    menuToggle: document.getElementById('menuToggle'),
    navLinks: document.querySelectorAll('.nav-link'),
    cardActions: document.querySelectorAll('.card-action'),
    views: document.querySelectorAll('.view'),
    pageTitle: document.getElementById('pageTitle'),
    pageSubtitle: document.getElementById('pageSubtitle'),
    addNewBtn: document.getElementById('addNewBtn'),
    globalSearch: document.getElementById('globalSearch'),
    modalOverlay: document.getElementById('modalOverlay'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.getElementById('modalClose'),
    detailPanelOverlay: document.getElementById('detailPanelOverlay'),
    detailPanel: document.getElementById('detailPanel'),
    detailPanelTitle: document.getElementById('detailPanelTitle'),
    detailPanelBody: document.getElementById('detailPanelBody'),
    detailPanelClose: document.getElementById('detailPanelClose'),
    toastContainer: document.getElementById('toastContainer')
};

// ============================================
// Utility Functions
// ============================================

/**
 * Escapes HTML to prevent XSS.
 * @param {string} str - String to escape.
 * @returns {string} Escaped string.
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Initializes Flatpickr date/time pickers on form inputs.
 * Call this after injecting form HTML into the DOM.
 */
function initDateTimePickers() {
    // Initialize date pickers
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input._flatpickr) return; // Already initialized
        
        // Parse existing value if present
        const existingValue = input.value;
        
        flatpickr(input, {
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'F j, Y',
            allowInput: false,
            disableMobile: true,
            defaultDate: existingValue || null,
            onChange: function(selectedDates, dateStr, instance) {
                // Ensure the hidden input has the correct format for form submission
                input.value = dateStr;
            }
        });
    });
    
    // Initialize time pickers
    document.querySelectorAll('input[type="time"]').forEach(input => {
        if (input._flatpickr) return; // Already initialized
        
        const existingValue = input.value;
        
        flatpickr(input, {
            enableTime: true,
            noCalendar: true,
            dateFormat: 'H:i',
            altInput: true,
            altFormat: 'h:i K',
            allowInput: false,
            disableMobile: true,
            time_24hr: false,
            defaultDate: existingValue || null
        });
    });
}

/**
 * Initializes custom styled dropdowns for select elements.
 * Creates a visual wrapper around native selects for full styling control.
 */
function initCustomDropdowns() {
    // Target both filter selects and form group selects
    const selects = document.querySelectorAll('.filter-select:not(.custom-initialized), .form-group select:not(.custom-initialized)');
    
    selects.forEach(select => {
        // Skip if already initialized
        if (select.classList.contains('custom-initialized')) return;
        select.classList.add('custom-initialized');
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        
        // Create trigger button
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.textContent = select.options[select.selectedIndex]?.text || 'Select...';
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-select-dropdown';
        
        // Populate options
        Array.from(select.options).forEach((option, index) => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-select-option';
            if (index === select.selectedIndex) {
                customOption.classList.add('selected');
            }
            customOption.textContent = option.text;
            customOption.dataset.value = option.value;
            
            customOption.addEventListener('click', (e) => {
                e.stopPropagation();
                // Update native select
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Update trigger text
                trigger.textContent = option.text;
                
                // Update selected state
                dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                customOption.classList.add('selected');
                
                // Close dropdown
                wrapper.classList.remove('open');
            });
            
            dropdown.appendChild(customOption);
        });
        
        // Insert wrapper
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(trigger);
        wrapper.appendChild(dropdown);
        
        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns
            document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });
        
        // Listen for programmatic changes to the select
        select.addEventListener('change', () => {
            trigger.textContent = select.options[select.selectedIndex]?.text || 'Select...';
            dropdown.querySelectorAll('.custom-select-option').forEach((opt, idx) => {
                opt.classList.toggle('selected', idx === select.selectedIndex);
            });
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) {
            document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
                w.classList.remove('open');
            });
        }
    });
}

/**
 * Formats a date to a readable string.
 * @param {string} dateStr - ISO date string.
 * @returns {string} Formatted date.
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Formats a timestamp to relative time.
 * @param {string} timestamp - ISO timestamp.
 * @returns {string} Relative time string.
 */
function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(timestamp);
}

/**
 * Gets initials from a name.
 * @param {string} name - Full name.
 * @returns {string} Initials (max 2 characters).
 */
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Formats a contact field (email/phone array) for brief display.
 * Shows first value + count indicator if multiple.
 * @param {Array|string|null} contacts - Contact array or string.
 * @returns {string} Formatted display string.
 */
function formatContactDisplay(contacts) {
    if (!contacts) return 'N/A';
    const arr = Array.isArray(contacts) ? contacts : [contacts];
    const filtered = arr.map(c => String(c || '')).filter(c => c.trim());
    if (filtered.length === 0) return 'N/A';
    if (filtered.length === 1) return escapeHtml(filtered[0]);
    return `${escapeHtml(filtered[0])} <span class="contact-count">+${filtered.length - 1}</span>`;
}

/**
 * Formats a contact field (email/phone array) as a list for detail view.
 * @param {Array|string|null} contacts - Contact array or string.
 * @param {string} type - Contact type (email or phone).
 * @returns {string} HTML string with all contacts.
 */
function formatContactList(contacts, type = 'email') {
    if (!contacts) return 'N/A';
    const arr = Array.isArray(contacts) ? contacts : [contacts];
    const filtered = arr.map(c => String(c || '')).filter(c => c.trim());
    if (filtered.length === 0) return 'N/A';
    
    const icon = type === 'email' 
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
    
    return filtered.map(contact => `
        <span class="contact-item">
            ${icon}
            ${type === 'email' 
                ? `<a href="mailto:${escapeHtml(contact)}">${escapeHtml(contact)}</a>`
                : `<a href="tel:${escapeHtml(contact)}">${escapeHtml(contact)}</a>`
            }
        </span>
    `).join('');
}

/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - Toast type (success, error, warning).
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;

    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

/**
 * Shows a custom confirmation modal.
 * @param {Object} options - Configuration options.
 * @param {string} options.title - Modal title.
 * @param {string} options.message - Modal message.
 * @param {string} options.confirmText - Text for confirm button.
 * @param {string} options.cancelText - Text for cancel button.
 * @param {string} options.type - Icon type (danger, warning).
 * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise.
 */
function showConfirmModal(options = {}) {
    return new Promise((resolve) => {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'danger'
        } = options;

        const overlay = document.getElementById('confirmModalOverlay');
        const titleEl = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const confirmBtn = document.getElementById('confirmModalConfirm');
        const cancelBtn = document.getElementById('confirmModalCancel');
        const iconEl = document.getElementById('confirmModalIcon');

        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        // Set button style based on type
        confirmBtn.className = type === 'warning' ? 'btn btn-warning' : 'btn btn-danger';
        iconEl.className = type === 'warning' ? 'confirm-modal-icon warning' : 'confirm-modal-icon';

        // Show modal
        overlay.classList.add('active');

        // Handle confirm
        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        // Handle cancel
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        // Handle escape key
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        };

        // Cleanup function
        const cleanup = () => {
            overlay.classList.remove('active');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            overlay.removeEventListener('click', handleOverlayClick);
            document.removeEventListener('keydown', handleKeydown);
        };

        // Handle click outside modal
        const handleOverlayClick = (e) => {
            if (e.target === overlay) {
                handleCancel();
            }
        };

        // Add event listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleOverlayClick);
        document.addEventListener('keydown', handleKeydown);

        // Focus confirm button
        setTimeout(() => confirmBtn.focus(), 100);
    });
}

// ============================================
// Navigation
// ============================================

const viewInfo = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of your workforce' },
    interns: { title: 'Minions', subtitle: 'Manage your worker bees' },
    projects: { title: 'Projects', subtitle: 'Track and manage projects' },
    tasks: { title: 'Tasks', subtitle: 'Organize tasks and assignments' },
    schedule: { title: 'Schedule', subtitle: 'Calendar and event management' },
    reports: { title: 'Reports', subtitle: 'Weekly progress reports' }
};

/**
 * Switches to a different view.
 * @param {string} viewName - The name of the view to switch to.
 */
function switchView(viewName) {
    AppState.currentView = viewName;

    // Update nav links
    elements.navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.view === viewName);
    });

    // Update views
    elements.views.forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}-view`);
    });

    // Update page title
    const info = viewInfo[viewName];
    elements.pageTitle.textContent = info.title;
    elements.pageSubtitle.textContent = info.subtitle;

    // Close mobile sidebar
    elements.sidebar.classList.remove('open');

    // Refresh view content
    refreshView(viewName);
}

/**
 * Refreshes the content of a view.
 * @param {string} viewName - The view to refresh.
 */
async function refreshView(viewName) {
    switch (viewName) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'interns':
            await loadInterns();
            break;
        case 'projects':
            await loadProjects();
            break;
        case 'tasks':
            await loadTasks();
            break;
        case 'schedule':
            await loadSchedule();
            break;
        case 'reports':
            await loadReports();
            break;
    }
    
    // Always update sidebar counts after any view refresh
    await updateSidebarCounts();
    
    // Initialize custom dropdowns for filter selects
    setTimeout(() => initCustomDropdowns(), 50);
}

/**
 * Updates the sidebar counts for interns, projects, and tasks.
 */
async function updateSidebarCounts() {
    try {
        const stats = await DashboardAPI.getStats();
        document.getElementById('interns-count').textContent = stats.interns.total;
        document.getElementById('projects-count').textContent = stats.projects.total;
        document.getElementById('tasks-count').textContent = stats.tasks.total;
        document.getElementById('active-interns').textContent = stats.interns.active;
        document.getElementById('pending-tasks').textContent = stats.tasks.pending;
    } catch (error) {
        console.error('Failed to update sidebar counts:', error);
    }
}

// ============================================
// Dashboard
// ============================================

/**
 * Gets the date range for weekly events (matches server logic).
 * @returns {Object} Object with startDate, endDate, and isExtended flag.
 */
function getWeeklyEventDateRange() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    const startDate = new Date(today);
    let endDate = new Date(today);
    
    // Calculate end of current week (Sunday)
    const daysUntilSunday = 7 - dayOfWeek;
    endDate.setDate(today.getDate() + daysUntilSunday);
    
    // If today is the last day of the week (Sunday), extend to next week
    const isExtended = dayOfWeek === 0;
    if (isExtended) {
        endDate.setDate(endDate.getDate() + 7);
    }
    
    return { startDate, endDate, isExtended };
}

/**
 * Updates the date range text for the events stat card.
 */
function updateEventsDateRangeText() {
    const { startDate, endDate, isExtended } = getWeeklyEventDateRange();
    const rangeEl = document.getElementById('events-date-range');
    if (!rangeEl) return;
    
    const formatShort = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (isExtended) {
        rangeEl.textContent = `${formatShort(startDate)} - ${formatShort(endDate)}`;
    } else {
        rangeEl.textContent = `This week`;
    }
}

/**
 * Cached weekly events data for detail view.
 */
let weeklyEventsCache = [];

/**
 * Shows the weekly events popup.
 * @param {Event} e - Click event.
 */
async function showWeeklyEventsPopup(e) {
    e.stopPropagation();
    
    const overlay = document.getElementById('eventsPopupOverlay');
    const body = document.getElementById('eventsPopupBody');
    const rangeEl = document.getElementById('eventsPopupRange');
    
    // Show loading state
    body.innerHTML = '<div class="loading-spinner">Loading events...</div>';
    overlay.classList.add('active');
    
    try {
        const data = await DashboardAPI.getWeeklyEvents();
        weeklyEventsCache = data.events || [];
        
        // Update range display
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        rangeEl.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
        
        renderWeeklyEventsList(body, weeklyEventsCache);
        
    } catch (error) {
        body.innerHTML = `
            <div class="events-popup-empty error">
                <p>Failed to load events</p>
                <button class="btn btn-secondary btn-sm" onclick="showWeeklyEventsPopup(event)">Try Again</button>
            </div>
        `;
    }
}

/**
 * Renders the weekly events list in the popup body.
 * @param {HTMLElement} body - The popup body element.
 * @param {Array} events - Array of events to render.
 */
function renderWeeklyEventsList(body, events) {
    if (!events || events.length === 0) {
        body.innerHTML = `
            <div class="events-popup-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p>No upcoming events this week</p>
                <button class="btn btn-primary btn-sm" onclick="closeWeeklyEventsPopup(); navigateTo('schedule');">
                    View Schedule
                </button>
            </div>
        `;
        return;
    }
    
    // Group events by date
    const eventsByDate = {};
    events.forEach(event => {
        const dateKey = event.event_date;
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
    });
    
    // Render grouped events
    let html = '<div class="events-list-view">';
    Object.keys(eventsByDate).sort().forEach(dateKey => {
        const dateObj = new Date(dateKey + 'T00:00:00');
        const isToday = new Date().toDateString() === dateObj.toDateString();
        const dayLabel = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        
        html += `<div class="events-date-group">
            <div class="events-date-header ${isToday ? 'today' : ''}">
                <span class="events-date-label">${dayLabel}</span>
                <span class="events-date-count">${eventsByDate[dateKey].length} event${eventsByDate[dateKey].length > 1 ? 's' : ''}</span>
            </div>
            <div class="events-date-list">`;
        
        eventsByDate[dateKey].forEach(event => {
            const eventColor = event.color || '#6366f1';
            const timeDisplay = event.start_time 
                ? `${formatTimeDisplay(event.start_time)}${event.end_time ? ' - ' + formatTimeDisplay(event.end_time) : ''}`
                : 'All day';
            
            const internsHtml = event.assigned_interns && event.assigned_interns.length > 0
                ? `<div class="event-item-interns">
                    ${event.assigned_interns.slice(0, 3).map(i => `
                        <span class="event-intern-avatar" style="background: ${i.avatar_color || '#6366f1'}" title="${escapeHtml(i.name)}">
                            ${getInitials(i.name)}
                        </span>
                    `).join('')}
                    ${event.assigned_interns.length > 3 ? `<span class="event-intern-more">+${event.assigned_interns.length - 3}</span>` : ''}
                   </div>`
                : '';
            
            html += `
                <div class="event-item" onclick="showEventDetailInPopup(${event.id})">
                    <div class="event-item-color" style="background: ${eventColor}"></div>
                    <div class="event-item-content">
                        <div class="event-item-title">${escapeHtml(event.title)}</div>
                        <div class="event-item-meta">
                            <span class="event-item-time">${timeDisplay}</span>
                            ${event.location ? `<span class="event-item-location">${escapeHtml(event.location)}</span>` : ''}
                        </div>
                        ${internsHtml}
                    </div>
                    <div class="event-item-type">
                        <span class="event-type-badge ${event.event_type}">${event.event_type}</span>
                    </div>
                    <div class="event-item-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });
    html += '</div>';
    
    body.innerHTML = html;
}

/**
 * Shows detailed view of a single event in the popup.
 * @param {number} eventId - The event ID to display.
 */
function showEventDetailInPopup(eventId) {
    const event = weeklyEventsCache.find(e => e.id === eventId);
    if (!event) return;
    
    const body = document.getElementById('eventsPopupBody');
    const eventColor = event.color || '#6366f1';
    const dateObj = new Date(event.event_date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    const timeDisplay = event.start_time 
        ? `${formatTimeDisplay(event.start_time)}${event.end_time ? ' - ' + formatTimeDisplay(event.end_time) : ''}`
        : 'All day';
    
    // Calculate duration if both times exist
    let durationDisplay = '';
    if (event.start_time && event.end_time) {
        const [sh, sm] = event.start_time.split(':').map(Number);
        const [eh, em] = event.end_time.split(':').map(Number);
        const durationMins = (eh * 60 + em) - (sh * 60 + sm);
        if (durationMins > 0) {
            const hours = Math.floor(durationMins / 60);
            const mins = durationMins % 60;
            durationDisplay = hours > 0 
                ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` 
                : `${mins}m`;
        }
    }
    
    // Build interns section
    let internsSection = '';
    if (event.assigned_interns && event.assigned_interns.length > 0) {
        internsSection = `
            <div class="event-detail-section">
                <h4>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Assigned Minions (${event.assigned_interns.length})
                </h4>
                <div class="event-detail-interns">
                    ${event.assigned_interns.map(intern => `
                        <div class="event-detail-intern" onclick="closeWeeklyEventsPopup(); showInternDetail(${intern.id});">
                            <span class="intern-avatar" style="background: ${intern.avatar_color || '#6366f1'}">
                                ${getInitials(intern.name)}
                            </span>
                            <span class="intern-name">${escapeHtml(intern.name)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build project section
    let projectSection = '';
    if (event.project_name) {
        projectSection = `
            <div class="event-detail-row">
                <span class="event-detail-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    Project
                </span>
                <span class="event-detail-value">${escapeHtml(event.project_name)}</span>
            </div>
        `;
    }
    
    body.innerHTML = `
        <div class="event-detail-view">
            <button class="event-detail-back" onclick="renderWeeklyEventsList(document.getElementById('eventsPopupBody'), weeklyEventsCache)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back to events
            </button>
            
            <div class="event-detail-header" style="border-left-color: ${eventColor}">
                <div class="event-detail-type">
                    <span class="event-type-badge ${event.event_type}">${event.event_type}</span>
                </div>
                <h3 class="event-detail-title">${escapeHtml(event.title)}</h3>
            </div>
            
            <div class="event-detail-info">
                <div class="event-detail-row">
                    <span class="event-detail-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Date
                    </span>
                    <span class="event-detail-value">${formattedDate}</span>
                </div>
                
                <div class="event-detail-row">
                    <span class="event-detail-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Time
                    </span>
                    <span class="event-detail-value">
                        ${timeDisplay}
                        ${durationDisplay ? `<span class="event-duration">(${durationDisplay})</span>` : ''}
                    </span>
                </div>
                
                ${event.location ? `
                <div class="event-detail-row">
                    <span class="event-detail-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        Location
                    </span>
                    <span class="event-detail-value">${escapeHtml(event.location)}</span>
                </div>
                ` : ''}
                
                ${projectSection}
            </div>
            
            ${event.description ? `
            <div class="event-detail-section">
                <h4>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="17" y1="10" x2="3" y2="10"/>
                        <line x1="21" y1="6" x2="3" y2="6"/>
                        <line x1="21" y1="14" x2="3" y2="14"/>
                        <line x1="17" y1="18" x2="3" y2="18"/>
                    </svg>
                    Description
                </h4>
                <p class="event-detail-description">${escapeHtml(event.description)}</p>
            </div>
            ` : ''}
            
            ${internsSection}
            
            <div class="event-detail-actions">
                <button class="btn btn-secondary" onclick="closeWeeklyEventsPopup(); navigateTo('schedule');">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    View in Schedule
                </button>
            </div>
        </div>
    `;
}

// Export event detail function
window.showEventDetailInPopup = showEventDetailInPopup;

/**
 * Formats time for display (e.g., "09:00" -> "9:00 AM").
 * @param {string} time - Time string in HH:MM format.
 * @returns {string} Formatted time string.
 */
function formatTimeDisplay(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

/**
 * Closes the weekly events popup.
 */
function closeWeeklyEventsPopup() {
    const overlay = document.getElementById('eventsPopupOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Closes a stat popup by overlay ID.
 * @param {string} overlayId - The overlay element ID.
 */
function closeStatPopup(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Shows the interns popup with details.
 * @param {Event} e - Click event.
 */
async function showInternsPopup(e) {
    e.stopPropagation();
    
    const overlay = document.getElementById('internsPopupOverlay');
    const body = document.getElementById('internsPopupBody');
    const badge = document.getElementById('internsPopupBadge');
    
    body.innerHTML = '<div class="loading-spinner">Loading interns...</div>';
    overlay.classList.add('active');
    
    try {
        const interns = await InternsAPI.getAll();
        badge.textContent = `${interns.length} total`;
        
        if (!interns || interns.length === 0) {
            body.innerHTML = `
                <div class="stat-popup-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                    </svg>
                    <p>No minions yet</p>
                </div>
            `;
            return;
        }
        
        // Group interns by status
        const grouped = { active: [], completed: [], terminated: [] };
        interns.forEach(intern => {
            const status = intern.status || 'active';
            if (grouped[status]) {
                grouped[status].push(intern);
            } else {
                grouped.active.push(intern);
            }
        });
        
        let html = '';
        
        // Active interns first
        if (grouped.active.length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">Active</span>
                        <span class="stat-popup-group-count">${grouped.active.length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped.active.map(intern => renderInternPopupItem(intern)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Completed interns
        if (grouped.completed.length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">Completed</span>
                        <span class="stat-popup-group-count">${grouped.completed.length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped.completed.map(intern => renderInternPopupItem(intern)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Terminated interns
        if (grouped.terminated.length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">Terminated</span>
                        <span class="stat-popup-group-count">${grouped.terminated.length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped.terminated.map(intern => renderInternPopupItem(intern)).join('')}
                    </div>
                </div>
            `;
        }
        
        body.innerHTML = html;
        
    } catch (error) {
        body.innerHTML = `
            <div class="stat-popup-empty">
                <p>Failed to load minions</p>
                <button class="btn btn-secondary btn-sm" onclick="showInternsPopup(event)">Try Again</button>
            </div>
        `;
    }
}

/**
 * Renders an intern item for the popup.
 * @param {Object} intern - Intern object.
 * @returns {string} HTML string.
 */
function renderInternPopupItem(intern) {
    const avatarColor = intern.avatar_color || '#6366f1';
    const initials = getInitials(intern.name);
    const emails = Array.isArray(intern.email) ? intern.email : [];
    const emailDisplay = emails.length > 0 ? emails[0] : 'No email';
    
    return `
        <div class="stat-popup-item" onclick="closeStatPopup('internsPopupOverlay'); showInternDetail(${intern.id});">
            <div class="stat-popup-item-avatar" style="background: ${avatarColor}">${initials}</div>
            <div class="stat-popup-item-content">
                <div class="stat-popup-item-title">${escapeHtml(intern.name)}</div>
                <div class="stat-popup-item-meta">
                    <span>${escapeHtml(intern.department || 'No department')}</span>
                    <span>${escapeHtml(emailDisplay)}</span>
                </div>
            </div>
            <span class="stat-popup-item-status ${intern.status || 'active'}">${intern.status || 'active'}</span>
            <div class="stat-popup-item-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>
        </div>
    `;
}

/**
 * Shows the projects popup with details.
 * @param {Event} e - Click event.
 */
async function showProjectsPopup(e) {
    e.stopPropagation();
    
    const overlay = document.getElementById('projectsPopupOverlay');
    const body = document.getElementById('projectsPopupBody');
    const badge = document.getElementById('projectsPopupBadge');
    
    body.innerHTML = '<div class="loading-spinner">Loading projects...</div>';
    overlay.classList.add('active');
    
    try {
        const projects = await ProjectsAPI.getAll();
        badge.textContent = `${projects.length} total`;
        
        if (!projects || projects.length === 0) {
            body.innerHTML = `
                <div class="stat-popup-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No projects yet</p>
                </div>
            `;
            return;
        }
        
        // Group projects by status
        const grouped = { active: [], pending: [], completed: [], 'on-hold': [] };
        projects.forEach(project => {
            const status = project.status || 'pending';
            if (grouped[status]) {
                grouped[status].push(project);
            } else {
                grouped.pending.push(project);
            }
        });
        
        let html = '';
        
        // Active projects first
        if (grouped.active.length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">Active</span>
                        <span class="stat-popup-group-count">${grouped.active.length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped.active.map(project => renderProjectPopupItem(project)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Pending projects
        if (grouped.pending.length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">Pending</span>
                        <span class="stat-popup-group-count">${grouped.pending.length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped.pending.map(project => renderProjectPopupItem(project)).join('')}
                    </div>
                </div>
            `;
        }
        
        // On-hold projects
        if (grouped['on-hold'].length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">On Hold</span>
                        <span class="stat-popup-group-count">${grouped['on-hold'].length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped['on-hold'].map(project => renderProjectPopupItem(project)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Completed projects
        if (grouped.completed.length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">Completed</span>
                        <span class="stat-popup-group-count">${grouped.completed.length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped.completed.map(project => renderProjectPopupItem(project)).join('')}
                    </div>
                </div>
            `;
        }
        
        body.innerHTML = html;
        
    } catch (error) {
        body.innerHTML = `
            <div class="stat-popup-empty">
                <p>Failed to load projects</p>
                <button class="btn btn-secondary btn-sm" onclick="showProjectsPopup(event)">Try Again</button>
            </div>
        `;
    }
}

/**
 * Renders a project item for the popup.
 * @param {Object} project - Project object.
 * @returns {string} HTML string.
 */
function renderProjectPopupItem(project) {
    const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    const priorityColor = priorityColors[project.priority] || priorityColors.medium;
    const internsCount = project.interns ? project.interns.length : 0;
    const deadline = project.deadline ? formatDate(project.deadline) : 'No deadline';
    const taskStats = project.task_stats;
    const taskText = taskStats?.total > 0 
        ? `${taskStats.completed}/${taskStats.total} tasks` 
        : 'No tasks';
    
    return `
        <div class="stat-popup-item" onclick="closeStatPopup('projectsPopupOverlay'); showProjectDetail(${project.id});">
            <div class="stat-popup-item-icon" style="background: rgba(163, 113, 247, 0.15); color: var(--purple);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
            </div>
            <div class="stat-popup-item-content">
                <div class="stat-popup-item-title">${escapeHtml(project.name)}</div>
                <div class="stat-popup-item-meta">
                    <span class="priority-indicator ${project.priority || 'medium'}"></span>
                    <span>${taskText}</span>
                    <span>${deadline}</span>
                </div>
            </div>
            <span class="stat-popup-item-status ${project.status || 'pending'}">${project.status || 'pending'}</span>
            <div class="stat-popup-item-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>
        </div>
    `;
}

/**
 * Shows the tasks popup with details.
 * @param {Event} e - Click event.
 */
async function showTasksPopup(e) {
    e.stopPropagation();
    
    const overlay = document.getElementById('tasksPopupOverlay');
    const body = document.getElementById('tasksPopupBody');
    const badge = document.getElementById('tasksPopupBadge');
    
    body.innerHTML = '<div class="loading-spinner">Loading tasks...</div>';
    overlay.classList.add('active');
    
    try {
        const tasks = await TasksAPI.getAll();
        badge.textContent = `${tasks.length} total`;
        
        if (!tasks || tasks.length === 0) {
            body.innerHTML = `
                <div class="stat-popup-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    <p>No tasks yet</p>
                </div>
            `;
            return;
        }
        
        // Group tasks by status
        const grouped = { pending: [], 'in-progress': [], completed: [] };
        tasks.forEach(task => {
            const status = task.status || 'pending';
            if (grouped[status]) {
                grouped[status].push(task);
            } else {
                grouped.pending.push(task);
            }
        });
        
        let html = '';
        
        // In-progress tasks first
        if (grouped['in-progress'].length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">In Progress</span>
                        <span class="stat-popup-group-count">${grouped['in-progress'].length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped['in-progress'].map(task => renderTaskPopupItem(task)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Pending tasks
        if (grouped.pending.length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">Pending</span>
                        <span class="stat-popup-group-count">${grouped.pending.length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped.pending.map(task => renderTaskPopupItem(task)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Completed tasks
        if (grouped.completed.length > 0) {
            html += `
                <div class="stat-popup-group">
                    <div class="stat-popup-group-header">
                        <span class="stat-popup-group-label">Completed</span>
                        <span class="stat-popup-group-count">${grouped.completed.length}</span>
                    </div>
                    <div class="stat-popup-list">
                        ${grouped.completed.map(task => renderTaskPopupItem(task)).join('')}
                    </div>
                </div>
            `;
        }
        
        body.innerHTML = html;
        
    } catch (error) {
        body.innerHTML = `
            <div class="stat-popup-empty">
                <p>Failed to load tasks</p>
                <button class="btn btn-secondary btn-sm" onclick="showTasksPopup(event)">Try Again</button>
            </div>
        `;
    }
}

/**
 * Renders a task item for the popup.
 * @param {Object} task - Task object.
 * @returns {string} HTML string.
 */
function renderTaskPopupItem(task) {
    const dueDate = task.due_date ? formatDate(task.due_date) : 'No due date';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
    
    return `
        <div class="stat-popup-item" onclick="closeStatPopup('tasksPopupOverlay'); showTaskModal(${task.id});">
            <div class="stat-popup-item-icon" style="background: var(--success-muted); color: var(--success);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${task.status === 'completed' 
                        ? '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
                        : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 12h6"/>'}
                </svg>
            </div>
            <div class="stat-popup-item-content">
                <div class="stat-popup-item-title">${escapeHtml(task.title)}</div>
                <div class="stat-popup-item-meta">
                    <span>${escapeHtml(task.intern_name || 'Unassigned')}</span>
                    <span style="${isOverdue ? 'color: var(--danger);' : ''}">${dueDate}</span>
                </div>
            </div>
            <span class="stat-popup-item-status ${task.status || 'pending'}">${task.status || 'pending'}</span>
            <div class="stat-popup-item-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>
        </div>
    `;
}

/**
 * Navigates to a specific view.
 * @param {string} viewName - The view name to navigate to.
 */
function navigateTo(viewName) {
    switchView(viewName);
}

// Export popup and navigation functions
window.showWeeklyEventsPopup = showWeeklyEventsPopup;
window.closeWeeklyEventsPopup = closeWeeklyEventsPopup;
window.closeStatPopup = closeStatPopup;
window.showInternsPopup = showInternsPopup;
window.showProjectsPopup = showProjectsPopup;
window.showTasksPopup = showTasksPopup;
window.navigateTo = navigateTo;

/**
 * Loads and renders the dashboard.
 */
async function loadDashboard() {
    try {
        const [stats, activity, upcoming, interns] = await Promise.all([
            DashboardAPI.getStats(),
            DashboardAPI.getActivity(10),
            DashboardAPI.getUpcoming(),
            InternsAPI.getAll({ status: 'active' })
        ]);

        // Update stats
        document.getElementById('stat-total-interns').textContent = stats.interns.total;
        document.getElementById('stat-active-interns').textContent = `${stats.interns.active} active`;
        document.getElementById('stat-total-projects').textContent = stats.projects.total;
        document.getElementById('stat-active-projects').textContent = `${stats.projects.active} active`;
        document.getElementById('stat-total-tasks').textContent = stats.tasks.total;
        document.getElementById('stat-completed-tasks').textContent = `${stats.tasks.completed} completed`;
        document.getElementById('stat-upcoming-events').textContent = stats.events.upcoming;
        
        // Update the date range text for events stat card
        updateEventsDateRangeText();

        // Update sidebar counts
        document.getElementById('interns-count').textContent = stats.interns.total;
        document.getElementById('projects-count').textContent = stats.projects.total;
        document.getElementById('tasks-count').textContent = stats.tasks.total;
        document.getElementById('active-interns').textContent = stats.interns.active;
        document.getElementById('pending-tasks').textContent = stats.tasks.pending;

        // Render activity feed
        renderActivityFeed(activity);

        // Render deadlines
        renderDeadlines(upcoming);

        // Render task summary
        renderTasksSummary(stats.tasks);

        // Render interns preview
        renderInternsPreview(interns);

    } catch (error) {
        showToast('Failed to load dashboard', 'error');
    }
}

/**
 * Renders the activity feed.
 * @param {Array} activities - List of activity entries.
 */
function renderActivityFeed(activities) {
    const container = document.getElementById('activityFeed');

    if (!activities.length) {
        container.innerHTML = '<div class="empty-state small"><p>No recent activity</p></div>';
        return;
    }

    container.innerHTML = activities.map(a => `
        <div class="activity-item">
            <div class="activity-dot ${a.action}"></div>
            <div class="activity-content">
                <p class="activity-text"><strong>${escapeHtml(a.action)}</strong> ${escapeHtml(a.entity_type)}: ${escapeHtml(a.entity_name)}</p>
                <span class="activity-time">${formatTimeAgo(a.created_at)}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Renders upcoming deadlines.
 * @param {Object} upcoming - Upcoming projects, tasks, and events.
 */
function renderDeadlines(upcoming) {
    const container = document.getElementById('deadlinesList');
    const items = [...upcoming.projects, ...upcoming.tasks].sort((a, b) => 
        new Date(a.due_date) - new Date(b.due_date)
    ).slice(0, 5);

    if (!items.length) {
        container.innerHTML = '<div class="empty-state small"><p>No upcoming deadlines</p></div>';
        return;
    }

    const today = new Date();
    container.innerHTML = items.map(item => {
        const dueDate = new Date(item.due_date);
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        const isUrgent = daysUntil <= 3;

        return `
            <div class="deadline-item ${isUrgent ? 'urgent' : ''}">
                <div class="deadline-info">
                    <h4>${escapeHtml(item.name)}</h4>
                    <span>${item.type === 'project' ? 'Project' : 'Task'}</span>
                </div>
                <span class="deadline-date">${formatDate(item.due_date)}</span>
            </div>
        `;
    }).join('');
}

/**
 * Renders the tasks summary chart.
 * @param {Object} taskStats - Task statistics.
 */
function renderTasksSummary(taskStats) {
    const total = taskStats.total || 1;
    
    document.getElementById('tasks-pending-count').textContent = taskStats.pending;
    document.getElementById('tasks-progress-count').textContent = taskStats.in_progress;
    document.getElementById('tasks-completed-count').textContent = taskStats.completed;

    document.querySelector('.task-stat-fill.pending').style.width = `${(taskStats.pending / total) * 100}%`;
    document.querySelector('.task-stat-fill.in-progress').style.width = `${(taskStats.in_progress / total) * 100}%`;
    document.querySelector('.task-stat-fill.completed').style.width = `${(taskStats.completed / total) * 100}%`;
}

/**
 * Renders the interns preview.
 * @param {Array} interns - List of active interns.
 */
function renderInternsPreview(interns) {
    const container = document.getElementById('internsPreview');

    if (!interns.length) {
        container.innerHTML = '<div class="empty-state small"><p>No active minions</p></div>';
        return;
    }

    container.innerHTML = interns.slice(0, 10).map(intern => `
        <div class="intern-avatar-preview" 
             style="background: ${intern.avatar_color || '#6366f1'}"
             title="${escapeHtml(intern.name)}"
             onclick="showInternDetail(${intern.id})">
            ${getInitials(intern.name)}
        </div>
    `).join('');
}

// ============================================
// Interns
// ============================================

/**
 * Loads and renders interns.
 */
async function loadInterns() {
    try {
        const statusFilter = document.getElementById('internStatusFilter')?.value;
        const deptFilter = document.getElementById('internDeptFilter')?.value;
        
        const params = {};
        if (statusFilter) params.status = statusFilter;
        if (deptFilter) params.department = deptFilter;

        const [interns, departments] = await Promise.all([
            InternsAPI.getAll(params),
            DashboardAPI.getDepartments()
        ]);

        AppState.interns = interns;
        
        // Update department filter
        const deptSelect = document.getElementById('internDeptFilter');
        if (deptSelect && deptSelect.options.length <= 1) {
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                deptSelect.appendChild(option);
            });
        }

        renderInterns(interns);
    } catch (error) {
        showToast('Failed to load minions', 'error');
    }
}

/**
 * Renders the interns grid.
 * @param {Array} interns - List of interns.
 */
function renderInterns(interns) {
    const container = document.getElementById('internsContainer');

    if (!interns.length) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                </svg>
                <h3>No minions yet</h3>
                <p>Get started by adding your first minion</p>
                <button class="btn btn-primary" onclick="showInternModal()">Add Minion</button>
            </div>
        `;
        return;
    }

    container.innerHTML = interns.map(intern => `
        <div class="intern-card" onclick="showInternDetail(${intern.id})">
            <div class="intern-header">
                <div class="intern-avatar" style="background: ${intern.avatar_color || '#6366f1'}">
                    ${getInitials(intern.name)}
                </div>
                <div class="intern-info">
                    <h3>${escapeHtml(intern.name)}</h3>
                    <span class="role">${escapeHtml(intern.role || 'No role assigned')}</span>
                </div>
                <div class="intern-status">
                    <span class="status-badge status-${intern.status}">${intern.status}</span>
                </div>
            </div>
            <div class="intern-meta">
                <div class="meta-item">
                    <span class="label">Department</span>
                    <span class="value">${escapeHtml(intern.department || 'N/A')}</span>
                </div>
                <div class="meta-item">
                    <span class="label">Email</span>
                    <span class="value">${formatContactDisplay(intern.email)}</span>
                </div>
                <div class="meta-item">
                    <span class="label">Start Date</span>
                    <span class="value">${formatDate(intern.start_date)}</span>
                </div>
                <div class="meta-item">
                    <span class="label">End Date</span>
                    <span class="value">${formatDate(intern.end_date)}</span>
                </div>
            </div>
            <div class="intern-actions" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-sm" onclick="showInternModal(${intern.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteIntern(${intern.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Generates HTML for a multi-input field (email or phone).
 * @param {string} fieldName - Field name (email or phone).
 * @param {Array} values - Array of existing values.
 * @param {string} placeholder - Placeholder text.
 * @param {string} inputType - Input type (email or tel).
 * @returns {string} HTML string.
 */
function generateMultiInputField(fieldName, values, placeholder, inputType) {
    const items = values.length > 0 ? values : [''];
    return items.map((value, index) => `
        <div class="multi-input-item" data-field="${fieldName}" data-index="${index}">
            <input type="${inputType}" 
                   name="${fieldName}[]" 
                   value="${escapeHtml(value)}" 
                   placeholder="${placeholder}"
                   class="multi-input-field">
            <button type="button" class="btn-icon btn-remove-input" onclick="removeMultiInput(this)" title="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');
}

/**
 * Adds a new input to a multi-input field.
 * @param {HTMLElement} button - The add button clicked.
 * @param {string} fieldName - Field name (email or phone).
 * @param {string} placeholder - Placeholder text.
 * @param {string} inputType - Input type (email or tel).
 */
function addMultiInput(button, fieldName, placeholder, inputType) {
    const container = button.closest('.multi-input-group').querySelector('.multi-input-list');
    const newIndex = container.querySelectorAll('.multi-input-item').length;
    const newItem = document.createElement('div');
    newItem.className = 'multi-input-item';
    newItem.dataset.field = fieldName;
    newItem.dataset.index = newIndex;
    newItem.innerHTML = `
        <input type="${inputType}" 
               name="${fieldName}[]" 
               value="" 
               placeholder="${placeholder}"
               class="multi-input-field">
        <button type="button" class="btn-icon btn-remove-input" onclick="removeMultiInput(this)" title="Remove">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    container.appendChild(newItem);
    newItem.querySelector('input').focus();
}

/**
 * Removes a multi-input item.
 * @param {HTMLElement} button - The remove button clicked.
 */
function removeMultiInput(button) {
    const item = button.closest('.multi-input-item');
    const container = item.closest('.multi-input-list');
    // Always keep at least one input
    if (container.querySelectorAll('.multi-input-item').length > 1) {
        item.remove();
    } else {
        // Clear the input instead of removing
        item.querySelector('input').value = '';
    }
}

// Export multi-input functions
window.addMultiInput = addMultiInput;
window.removeMultiInput = removeMultiInput;

/**
 * Shows the intern creation/edit modal.
 * @param {number|null} id - Intern ID for editing, or null for new.
 */
async function showInternModal(id = null) {
    const isEdit = id !== null;
    let intern = null;

    if (isEdit) {
        try {
            intern = await InternsAPI.getById(id);
        } catch (error) {
            showToast('Failed to load minion', 'error');
            return;
        }
    }

    // Ensure email and phone are arrays
    const emails = Array.isArray(intern?.email) ? intern.email : (intern?.email ? [intern.email] : []);
    const phones = Array.isArray(intern?.phone) ? intern.phone : (intern?.phone ? [intern.phone] : []);

    elements.modalTitle.textContent = isEdit ? 'Edit Minion' : 'Add New Minion';
    elements.modalBody.innerHTML = `
        <form id="internForm">
            <div class="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" required value="${intern?.name || ''}" placeholder="Enter full name">
            </div>
            <div class="form-row">
                <div class="form-group multi-input-group">
                    <label>
                        Email
                        <button type="button" class="btn-add-input" onclick="addMultiInput(this, 'email', 'email@example.com', 'email')" title="Add another email">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                    </label>
                    <div class="multi-input-list">
                        ${generateMultiInputField('email', emails, 'email@example.com', 'email')}
                    </div>
                </div>
                <div class="form-group multi-input-group">
                    <label>
                        Phone
                        <button type="button" class="btn-add-input" onclick="addMultiInput(this, 'phone', '+1 234 567 8900', 'tel')" title="Add another phone">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                    </label>
                    <div class="multi-input-list">
                        ${generateMultiInputField('phone', phones, '+1 234 567 8900', 'tel')}
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Department</label>
                    <input type="text" name="department" value="${intern?.department || ''}" placeholder="e.g., Engineering">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" name="role" value="${intern?.role || ''}" placeholder="e.g., Software Intern">
                </div>
            </div>
            <div class="form-group">
                <label>University</label>
                <input type="text" name="university" value="${intern?.university || ''}" placeholder="University name">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" name="start_date" value="${intern?.start_date || ''}">
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="date" name="end_date" value="${intern?.end_date || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option value="active" ${intern?.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="completed" ${intern?.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="terminated" ${intern?.status === 'terminated' ? 'selected' : ''}>Terminated</option>
                </select>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea name="notes" placeholder="Additional notes...">${intern?.notes || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Minion</button>
            </div>
        </form>
    `;

    document.getElementById('internForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Collect multi-input values as arrays
        const emailInputs = document.querySelectorAll('input[name="email[]"]');
        const phoneInputs = document.querySelectorAll('input[name="phone[]"]');
        
        const emails = Array.from(emailInputs).map(i => i.value.trim()).filter(v => v);
        const phones = Array.from(phoneInputs).map(i => i.value.trim()).filter(v => v);

        const data = {
            name: formData.get('name'),
            email: emails,
            phone: phones,
            department: formData.get('department'),
            role: formData.get('role'),
            university: formData.get('university'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            status: formData.get('status'),
            notes: formData.get('notes')
        };

        try {
            if (isEdit) {
                await InternsAPI.update(id, data);
                showToast('Minion updated successfully');
            } else {
                await InternsAPI.create(data);
                showToast('Minion added successfully');
            }
            closeModal();
            refreshView(AppState.currentView);
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    openModal();
}

/**
 * Cached trait definitions loaded from API.
 */
let INTERN_TRAITS = [];

/**
 * Traits API for managing trait definitions.
 */
const TraitsAPI = {
    async getAll() {
        const response = await fetch('/api/traits');
        if (!response.ok) throw new Error('Failed to fetch traits');
        return response.json();
    },
    
    async create(traitData) {
        const response = await fetch('/api/traits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(traitData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create trait');
        }
        return response.json();
    },
    
    async update(key, traitData) {
        const response = await fetch(`/api/traits/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(traitData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update trait');
        }
        return response.json();
    },
    
    async delete(key) {
        const response = await fetch(`/api/traits/${key}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete trait');
        }
        return response.json();
    },
    
    async reorder(key, newIndex) {
        const response = await fetch(`/api/traits/${key}/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newIndex })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to reorder trait');
        }
        return response.json();
    }
};

/**
 * Loads traits from the API.
 */
async function loadTraits() {
    try {
        INTERN_TRAITS = await TraitsAPI.getAll();
    } catch (error) {
        console.error('Failed to load traits:', error);
        // Use fallback defaults if API fails
        INTERN_TRAITS = [
            { key: 'technical', label: 'Technical Skills', abbr: 'TEC', description: 'Technical ability & code quality' },
            { key: 'communication', label: 'Communication', abbr: 'COM', description: 'Verbal & written communication' },
            { key: 'initiative', label: 'Initiative', abbr: 'INI', description: 'Proactiveness & self-direction' },
            { key: 'reliability', label: 'Reliability', abbr: 'REL', description: 'Punctuality & meeting deadlines' },
            { key: 'quality', label: 'Quality', abbr: 'QUA', description: 'Quality of work output' },
            { key: 'teamwork', label: 'Teamwork', abbr: 'TEA', description: 'Collaboration with others' }
        ];
    }
}

/**
 * Gets a trait definition by key.
 * @param {string} key - Trait key.
 * @returns {Object|null} Trait definition or null.
 */
function getTraitByKey(key) {
    return INTERN_TRAITS.find(t => t.key === key) || null;
}

/**
 * Gets intern traits, using stored values or defaults.
 * @param {Object} intern - Intern data.
 * @returns {Object} Trait values and calculated overall.
 */
function getInternTraits(intern) {
    // Get stored traits or use defaults (50 for new interns)
    const storedTraits = intern.traits || {};
    const traitValues = {};
    
    // Build trait values from current trait definitions
    for (const trait of INTERN_TRAITS) {
        traitValues[trait.key] = storedTraits[trait.key] ?? 50;
    }
    
    // Calculate overall rating (equal weight for all traits)
    const traitKeys = Object.keys(traitValues);
    const sum = traitKeys.reduce((acc, key) => acc + traitValues[key], 0);
    const overall = traitKeys.length > 0 ? Math.round(sum / traitKeys.length) : 50;
    
    return {
        overall,
        ...traitValues
    };
}

/**
 * Updates a single trait for an intern.
 * @param {number} internId - Intern ID.
 * @param {string} traitName - Name of the trait to update.
 * @param {number} value - New value (1-99).
 */
async function updateInternTrait(internId, traitName, value) {
    try {
        // Clamp value between 1 and 99
        const clampedValue = Math.max(1, Math.min(99, value));
        
        // Get current intern data
        const intern = await InternsAPI.getById(internId);
        
        // Update traits object
        const traits = intern.traits || {};
        traits[traitName] = clampedValue;
        
        // Save updated intern
        await InternsAPI.update(internId, { traits });
        
        // Update DOM directly instead of re-rendering
        updateTraitDisplay(internId, traitName, clampedValue, traits);
        
        const trait = getTraitByKey(traitName);
        showToast(`${trait?.label || traitName} updated to ${clampedValue}`, 'success');
    } catch (error) {
        showToast('Failed to update trait', 'error');
    }
}

/**
 * Adjusts a trait value by a delta amount.
 * Updates DOM directly without re-rendering to preserve scroll position.
 * @param {number} internId - Intern ID.
 * @param {string} traitName - Name of the trait.
 * @param {number} delta - Amount to change (+1 or -1).
 */
async function adjustInternTrait(internId, traitName, delta) {
    try {
        const intern = await InternsAPI.getById(internId);
        const traits = intern.traits || {};
        const currentValue = traits[traitName] ?? 50;
        const newValue = Math.max(1, Math.min(99, currentValue + delta));
        
        if (newValue !== currentValue) {
            traits[traitName] = newValue;
            await InternsAPI.update(internId, { traits });
            
            // Update DOM directly instead of re-rendering
            updateTraitDisplay(internId, traitName, newValue, traits);
        }
    } catch (error) {
        showToast('Failed to update trait', 'error');
    }
}

/**
 * Updates the trait display in the DOM without re-rendering the entire modal.
 * @param {number} internId - Intern ID.
 * @param {string} traitName - Name of the trait that changed.
 * @param {number} newValue - The new trait value.
 * @param {Object} allTraits - All trait values for recalculating overall.
 */
function updateTraitDisplay(internId, traitName, newValue, allTraits) {
    // Find and update the trait control value and bar
    const traitControls = document.querySelectorAll('.trait-control-item');
    traitControls.forEach(control => {
        const minusBtn = control.querySelector('.trait-btn-minus');
        if (minusBtn && minusBtn.onclick?.toString().includes(`'${traitName}'`)) {
            // Update value display
            const valueEl = control.querySelector('.trait-control-value');
            if (valueEl) {
                valueEl.textContent = newValue;
                valueEl.className = `trait-control-value ${getStatColorClass(newValue)}`;
            }
            
            // Update progress bar
            const barFill = control.querySelector('.stat-bar-fill');
            if (barFill) {
                barFill.style.width = `${newValue}%`;
                barFill.className = `stat-bar-fill ${getStatColorClass(newValue)}`;
            }
        }
    });
    
    // Update the card stat for this trait
    const trait = getTraitByKey(traitName);
    if (trait) {
        const cardStats = document.querySelectorAll('.card-stat');
        cardStats.forEach(stat => {
            const label = stat.querySelector('.card-stat-label');
            if (label && label.textContent === trait.abbr) {
                const valueEl = stat.querySelector('.card-stat-value');
                if (valueEl) {
                    valueEl.textContent = newValue;
                    valueEl.className = `card-stat-value ${getStatColorClass(newValue)}`;
                }
            }
        });
    }
    
    // Recalculate and update overall rating
    const traitKeys = INTERN_TRAITS.map(t => t.key);
    let total = 0;
    let count = 0;
    traitKeys.forEach(key => {
        const value = allTraits[key] ?? 50;
        total += value;
        count++;
    });
    const overall = count > 0 ? Math.round(total / count) : 50;
    
    // Update overall rating on card
    const overallEl = document.querySelector('.card-overall-rating');
    if (overallEl) {
        overallEl.textContent = overall;
    }
    
    // Update card type (gold/silver/bronze) if needed
    const newCardType = getCardType(overall);
    const fifaCard = document.querySelector('.fifa-card');
    if (fifaCard) {
        fifaCard.classList.remove('gold', 'silver', 'bronze');
        fifaCard.classList.add(newCardType);
    }
}

/**
 * Gets card type (gold, silver, bronze) based on overall rating.
 * @param {number} overall - Overall rating.
 * @returns {string} Card type class.
 */
function getCardType(overall) {
    if (overall >= 75) return 'gold';
    if (overall >= 55) return 'silver';
    return 'bronze';
}

/**
 * Gets stat color class based on value.
 * @param {number} value - Stat value.
 * @returns {string} Color class.
 */
function getStatColorClass(value) {
    if (value >= 70) return 'high';
    if (value >= 50) return 'medium';
    return 'low';
}

/**
 * Generates the trait adjustment controls HTML.
 * @param {number} internId - Intern ID.
 * @param {string} traitKey - Trait key name.
 * @param {number} value - Current trait value.
 * @returns {string} HTML for trait controls.
 */
function renderTraitControls(internId, traitKey, value) {
    const trait = getTraitByKey(traitKey);
    if (!trait) return '';
    
    return `
        <div class="trait-control-item" data-trait-key="${traitKey}" data-intern-id="${internId}">
            <div class="trait-control-header">
                <span class="trait-control-label">${escapeHtml(trait.label)}</span>
                <span class="trait-control-value ${getStatColorClass(value)}" 
                      onclick="startTraitEdit(this, ${internId}, '${traitKey}', ${value})" 
                      title="Click to edit">${value}</span>
            </div>
            <div class="trait-control-bar">
                <button class="trait-btn trait-btn-minus" onclick="adjustInternTrait(${internId}, '${traitKey}', -1)" title="Decrease by 1">-</button>
                <div class="stat-bar-track" style="flex: 1;">
                    <div class="stat-bar-fill ${getStatColorClass(value)}" style="width: ${value}%"></div>
                </div>
                <button class="trait-btn trait-btn-plus" onclick="adjustInternTrait(${internId}, '${traitKey}', 1)" title="Increase by 1">+</button>
            </div>
            <span class="trait-control-desc">${escapeHtml(trait.description)}</span>
        </div>
    `;
}

/**
 * Starts inline editing of a trait value.
 * @param {HTMLElement} element - The value span element.
 * @param {number} internId - Intern ID.
 * @param {string} traitKey - Trait key name.
 * @param {number} currentValue - Current trait value.
 */
function startTraitEdit(element, internId, traitKey, currentValue) {
    // Don't start edit if already editing
    if (element.querySelector('input')) return;
    
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '99';
    input.value = currentValue;
    input.className = 'trait-edit-input';
    
    // Store original value for cancel
    input.dataset.originalValue = currentValue;
    
    // Replace span content with input
    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select();
    
    // Handle blur (save)
    input.addEventListener('blur', () => {
        finishTraitEdit(element, input, internId, traitKey);
    });
    
    // Handle enter key (save) and escape (cancel)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            input.value = input.dataset.originalValue;
            input.blur();
        }
    });
}

/**
 * Finishes inline editing of a trait value.
 * @param {HTMLElement} element - The value span element.
 * @param {HTMLInputElement} input - The input element.
 * @param {number} internId - Intern ID.
 * @param {string} traitKey - Trait key name.
 */
async function finishTraitEdit(element, input, internId, traitKey) {
    const newValue = parseInt(input.value) || 50;
    const clampedValue = Math.max(1, Math.min(99, newValue));
    const originalValue = parseInt(input.dataset.originalValue);
    
    // Restore span display
    element.textContent = clampedValue;
    element.className = `trait-control-value ${getStatColorClass(clampedValue)}`;
    
    // If value changed, update via API
    if (clampedValue !== originalValue) {
        try {
            const intern = await InternsAPI.getById(internId);
            const traits = intern.traits || {};
            traits[traitKey] = clampedValue;
            await InternsAPI.update(internId, { traits });
            
            // Update display
            updateTraitDisplay(internId, traitKey, clampedValue, traits);
        } catch (error) {
            // Revert on error
            element.textContent = originalValue;
            element.className = `trait-control-value ${getStatColorClass(originalValue)}`;
            showToast('Failed to update trait', 'error');
        }
    }
}

/**
 * Shows the trait management modal.
 */
async function showTraitManagement() {
    await loadTraits();
    
    elements.modal.classList.remove('large');
    elements.modalTitle.textContent = 'Manage Traits';
    
    const traitsHtml = INTERN_TRAITS.map((trait, index) => `
        <div class="trait-management-item" data-key="${trait.key}">
            <div class="trait-reorder-buttons">
                <button class="btn btn-icon btn-reorder" onclick="moveTraitUp('${trait.key}')" title="Move up" ${index === 0 ? 'disabled' : ''}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 15l-6-6-6 6"/>
                    </svg>
                </button>
                <button class="btn btn-icon btn-reorder" onclick="moveTraitDown('${trait.key}')" title="Move down" ${index === INTERN_TRAITS.length - 1 ? 'disabled' : ''}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </button>
            </div>
            <div class="trait-management-info">
                <span class="trait-abbr">${escapeHtml(trait.abbr)}</span>
                <div class="trait-details">
                    <span class="trait-label">${escapeHtml(trait.label)}</span>
                    <span class="trait-desc">${escapeHtml(trait.description)}</span>
                </div>
            </div>
            <button class="btn btn-icon btn-danger-subtle" onclick="deleteTrait('${trait.key}')" title="Delete trait">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
            </button>
        </div>
    `).join('');
    
    elements.modalBody.innerHTML = `
        <div class="trait-management">
            <p class="trait-management-info-text">Traits are used to grade interns. Changes apply to all interns. New traits default to 50.</p>
            
            <div class="trait-management-list">
                ${traitsHtml || '<p class="empty-text">No traits defined</p>'}
            </div>
            
            <div class="trait-add-form">
                <h4>Add New Trait</h4>
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label for="newTraitLabel">Label</label>
                        <input type="text" id="newTraitLabel" placeholder="e.g., Problem Solving" maxlength="30">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label for="newTraitAbbr">Abbr (3 chars)</label>
                        <input type="text" id="newTraitAbbr" placeholder="e.g., PRB" maxlength="3" style="text-transform: uppercase;">
                    </div>
                </div>
                <div class="form-group">
                    <label for="newTraitDesc">Description (optional)</label>
                    <input type="text" id="newTraitDesc" placeholder="e.g., Ability to analyze and solve problems" maxlength="100">
                </div>
                <button class="btn btn-primary" onclick="addNewTrait()">Add Trait</button>
            </div>
        </div>
    `;
    
    openModal();
}

/**
 * Adds a new trait.
 */
async function addNewTrait() {
    const label = document.getElementById('newTraitLabel').value.trim();
    const abbr = document.getElementById('newTraitAbbr').value.trim().toUpperCase();
    const description = document.getElementById('newTraitDesc').value.trim();
    
    if (!label) {
        showToast('Please enter a trait label', 'error');
        return;
    }
    
    if (!abbr || abbr.length > 3) {
        showToast('Please enter an abbreviation (1-3 characters)', 'error');
        return;
    }
    
    try {
        const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        await TraitsAPI.create({ key, label, abbr, description });
        showToast(`Trait "${label}" added successfully`);
        await loadTraits();
        showTraitManagement(); // Refresh the modal
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Deletes a trait.
 * @param {string} key - Trait key to delete.
 */
async function deleteTrait(key) {
    const trait = getTraitByKey(key);
    if (!trait) return;
    
    const confirmed = await showConfirmModal({
        title: 'Delete Trait',
        message: `Are you sure you want to delete the "${trait.label}" trait? This will remove it from all interns.`,
        confirmText: 'Delete',
        type: 'warning'
    });
    
    if (!confirmed) return;
    
    try {
        await TraitsAPI.delete(key);
        showToast(`Trait "${trait.label}" deleted`);
        await loadTraits();
        showTraitManagement(); // Refresh the modal
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Moves a trait up in the order.
 * @param {string} key - Trait key to move.
 */
async function moveTraitUp(key) {
    const index = INTERN_TRAITS.findIndex(t => t.key === key);
    if (index <= 0) return;
    
    try {
        await TraitsAPI.reorder(key, index - 1);
        await loadTraits();
        showTraitManagement(); // Refresh the modal
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Moves a trait down in the order.
 * @param {string} key - Trait key to move.
 */
async function moveTraitDown(key) {
    const index = INTERN_TRAITS.findIndex(t => t.key === key);
    if (index < 0 || index >= INTERN_TRAITS.length - 1) return;
    
    try {
        await TraitsAPI.reorder(key, index + 1);
        await loadTraits();
        showTraitManagement(); // Refresh the modal
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Shows the intern detail panel with FIFA-style card, files, and notes.
 * @param {number} id - Intern ID.
 * @param {string} activeTab - The tab to show (profile, files, notes).
 */
async function showInternDetail(id, activeTab = 'profile') {
    if (!id && id !== 0) {
        showToast('Invalid intern ID', 'error');
        console.error('showInternDetail called with invalid id:', id);
        return;
    }
    
    try {
        await loadTraits(); // Ensure traits are loaded
        const intern = await InternsAPI.getById(id);
        
        if (!intern || !intern.id) {
            showToast('Minion not found', 'error');
            console.error('Intern not found for id:', id, 'response:', intern);
            return;
        }
        
        console.log('Loaded intern:', intern.id, intern.name);
        const traitValues = getInternTraits(intern);
        const cardType = getCardType(traitValues.overall);
        
        // Generate card stats HTML dynamically
        const cardStatsHtml = INTERN_TRAITS.map(trait => `
            <div class="card-stat">
                <span class="card-stat-value ${getStatColorClass(traitValues[trait.key] || 50)}">${traitValues[trait.key] || 50}</span>
                <span class="card-stat-label">${escapeHtml(trait.abbr)}</span>
            </div>
        `).join('');
        
        // Generate trait controls HTML dynamically
        const traitControlsHtml = INTERN_TRAITS.map(trait => 
            renderTraitControls(id, trait.key, traitValues[trait.key] || 50)
        ).join('');
        
        elements.modal.classList.add('large');
        elements.modalTitle.textContent = escapeHtml(intern.name);
        elements.modalBody.innerHTML = `
            <div class="intern-detail-modal">
                <div class="intern-detail-tabs">
                    <button class="tab-btn ${activeTab === 'profile' ? 'active' : ''}" data-tab="profile">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        Profile
                    </button>
                    <button class="tab-btn ${activeTab === 'files' ? 'active' : ''}" data-tab="files">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Files
                    </button>
                    <button class="tab-btn ${activeTab === 'notes' ? 'active' : ''}" data-tab="notes">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Notes
                    </button>
                </div>
                
                <div class="intern-detail-content">
                    <!-- Profile Tab -->
                    <div class="tab-panel ${activeTab === 'profile' ? 'active' : ''}" id="tab-profile">
                        <div class="intern-card-modal">
                            <div class="fifa-card-container">
                                <div class="fifa-card ${cardType}">
                                    <div class="card-badge">
                                        <div class="card-status-indicator ${intern.status}"></div>
                                    </div>
                                    <div class="card-rating-section">
                                        <div class="card-overall-rating">${traitValues.overall}</div>
                                        <div class="card-position">${escapeHtml(intern.role?.split(' ')[0] || 'INT')}</div>
                                    </div>
                                    <div class="card-avatar-section">
                                        <div class="card-avatar" style="background: ${intern.avatar_color || '#6366f1'}">
                                            ${getInitials(intern.name)}
                                        </div>
                                    </div>
                                    <div class="card-info-section">
                                        <div class="card-name">${escapeHtml(intern.name)}</div>
                                        <div class="card-department">${escapeHtml(intern.department || 'No Department')}</div>
                                        <div class="card-divider"></div>
                                    </div>
                                    <div class="card-stats-section">
                                        <div class="card-stats-grid">${cardStatsHtml}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="card-details-panel">
                                <div class="card-details-header">
                                    <h3>Adjust Traits</h3>
                                    <div class="header-actions">
                                        <button class="btn btn-sm btn-ghost" onclick="showTraitManagement()" title="Manage Traits">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                                            </svg>
                                        </button>
                                        <span class="status-badge status-${intern.status}">${intern.status}</span>
                                    </div>
                                </div>
                                <div class="card-details-section trait-controls-section">
                                    <h4>Click +/- to adjust ratings (1-99)</h4>
                                    <div class="trait-controls">${traitControlsHtml || '<p class="empty-text">No traits defined. Click the gear icon to add traits.</p>'}</div>
                                </div>
                                <div class="card-details-section">
                                    <h4>Quick Info</h4>
                                    <div class="details-grid">
                                        <div class="detail-item"><span class="label">Email</span><span class="value contact-list">${formatContactList(intern.email, 'email')}</span></div>
                                        <div class="detail-item"><span class="label">Phone</span><span class="value contact-list">${formatContactList(intern.phone, 'phone')}</span></div>
                                        <div class="detail-item"><span class="label">University</span><span class="value">${escapeHtml(intern.university || 'N/A')}</span></div>
                                        <div class="detail-item"><span class="label">Duration</span><span class="value">${formatDate(intern.start_date)} - ${formatDate(intern.end_date)}</span></div>
                                    </div>
                                </div>
                                <div class="card-actions-row">
                                    <button class="btn btn-secondary" onclick="showInternModal(${id}); closeModal();">Edit Profile</button>
                                    <button class="btn btn-danger" onclick="deleteIntern(${id}); closeModal();">Delete</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Files Tab -->
                    <div class="tab-panel ${activeTab === 'files' ? 'active' : ''}" id="tab-files">
                        <div class="files-tab-content">
                            <div class="files-header">
                                <h3>Files & Attachments</h3>
                            </div>
                            <div class="file-drop-zone" id="fileDropZone" data-intern-id="${id}">
                                <div class="drop-zone-content">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="17 8 12 3 7 8"/>
                                        <line x1="12" y1="3" x2="12" y2="15"/>
                                    </svg>
                                    <p class="drop-zone-text">Drag & drop files here</p>
                                    <p class="drop-zone-subtext">or</p>
                                    <label class="btn btn-primary btn-sm file-upload-btn">
                                        Browse Files
                                        <input type="file" id="fileUploadInput" onchange="handleFileUpload(${id}, this)" hidden multiple>
                                    </label>
                                    <p class="drop-zone-hint">Supports: PDF, DOC, XLS, Images, ZIP (max 10MB)</p>
                                </div>
                            </div>
                            <div class="files-list" id="intern-files-list"><div class="loading-spinner">Loading files...</div></div>
                        </div>
                    </div>
                    
                    <!-- Notes Tab -->
                    <div class="tab-panel ${activeTab === 'notes' ? 'active' : ''}" id="tab-notes">
                        <div class="notes-tab-content">
                            <div class="notes-header">
                                <h3>Notes & Observations</h3>
                                <button class="btn btn-primary btn-sm" onclick="showAddNoteForm(${id})">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                    Add Note
                                </button>
                            </div>
                            <div id="add-note-form-container"></div>
                            <div class="notes-list" id="intern-notes-list"><div class="loading-spinner">Loading notes...</div></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add tab click handlers
        document.querySelectorAll('.intern-detail-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${tab}`).classList.add('active');
                if (tab === 'files') loadInternFiles(id);
                else if (tab === 'notes') loadInternNotes(id);
            });
        });

        openModal();
        if (activeTab === 'files') loadInternFiles(id);
        else if (activeTab === 'notes') loadInternNotes(id);
    } catch (error) {
        console.error('Error loading intern details for id:', id, error);
        showToast('Failed to load intern details: ' + error.message, 'error');
    }
}

/** Loads and displays files for an intern. */
async function loadInternFiles(internId) {
    const container = document.getElementById('intern-files-list');
    if (!container) return;
    
    // Setup drag and drop zone
    setupFileDropZone(internId);
    
    try {
        const files = await InternFilesAPI.getAll(internId);
        if (files.length === 0) {
            container.innerHTML = `<div class="empty-state small"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>No files uploaded yet</p><p class="empty-hint">Drag files here or click Browse</p></div>`;
            return;
        }
        container.innerHTML = files.map(file => `
            <div class="file-item-card" data-file-id="${file.id}">
                <div class="file-item-main">
                    <div class="file-icon ${getFileIconClass(file.file_type)}">${getFileIcon(file.file_type)}</div>
                    <div class="file-info">
                        <div class="file-name">${escapeHtml(file.original_name)}</div>
                        <div class="file-meta">
                            <span class="file-size">${formatFileSize(file.file_size)}</span>
                            <span class="file-datetime">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                                ${formatDateTime(file.uploaded_at)}
                            </span>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn btn-sm btn-ghost file-notes-toggle ${file.description ? 'has-notes' : ''}" 
                            onclick="toggleFileNotes(this)" title="${file.description ? 'View/Edit Notes' : 'Add Notes'}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <a href="${InternFilesAPI.getDownloadUrl(internId, file.id)}" class="btn btn-sm btn-ghost" title="Download" download>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </a>
                        <button class="btn btn-sm btn-ghost btn-danger" onclick="deleteInternFile(${internId}, ${file.id})" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
                <div class="file-notes-panel" style="display: none;">
                    <textarea class="file-notes-input" placeholder="Add notes about this file..." 
                        data-intern-id="${internId}" data-file-id="${file.id}"
                        onblur="saveFileNotes(${internId}, ${file.id}, this.value)">${escapeHtml(file.description || '')}</textarea>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="error-message">Failed to load files</div>`;
    }
}

/** Sets up drag and drop functionality for file uploads. */
function setupFileDropZone(internId) {
    const dropZone = document.getElementById('fileDropZone');
    if (!dropZone || dropZone.dataset.initialized) return;
    
    dropZone.dataset.initialized = 'true';
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });
    
    dropZone.addEventListener('drop', async (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await handleDroppedFiles(internId, files);
        }
    });
}

/** Handles multiple dropped files. */
async function handleDroppedFiles(internId, files) {
    for (const file of files) {
        try {
            showToast(`Uploading ${file.name}...`, 'info');
            await InternFilesAPI.upload(internId, file);
            showToast(`${file.name} uploaded successfully`);
        } catch (error) {
            showToast(`Failed to upload ${file.name}: ${error.message}`, 'error');
        }
    }
    loadInternFiles(internId);
}

/**
 * Toggles the visibility of the file notes panel.
 * @param {HTMLElement} button - The toggle button that was clicked.
 */
function toggleFileNotes(button) {
    const fileCard = button.closest('.file-item-card');
    const notesPanel = fileCard.querySelector('.file-notes-panel');
    const isVisible = notesPanel.style.display !== 'none';
    
    // Close all other open panels first
    document.querySelectorAll('.file-notes-panel').forEach(panel => {
        if (panel !== notesPanel) {
            panel.style.display = 'none';
            const otherButton = panel.closest('.file-item-card').querySelector('.file-notes-toggle');
            if (otherButton) otherButton.classList.remove('active');
        }
    });
    
    if (isVisible) {
        notesPanel.style.display = 'none';
        button.classList.remove('active');
    } else {
        notesPanel.style.display = 'block';
        button.classList.add('active');
        // Focus the textarea
        const textarea = notesPanel.querySelector('textarea');
        if (textarea) textarea.focus();
    }
}

/** Saves file notes/description. */
async function saveFileNotes(internId, fileId, notes) {
    try {
        await InternFilesAPI.update(internId, fileId, { description: notes });
        // Update the has-notes class on the toggle button
        const fileCard = document.querySelector(`.file-item-card[data-file-id="${fileId}"]`);
        if (fileCard) {
            const toggleBtn = fileCard.querySelector('.file-notes-toggle');
            if (toggleBtn) {
                if (notes && notes.trim()) {
                    toggleBtn.classList.add('has-notes');
                    toggleBtn.title = 'View/Edit Notes';
                } else {
                    toggleBtn.classList.remove('has-notes');
                    toggleBtn.title = 'Add Notes';
                }
            }
        }
    } catch (error) {
        showToast('Failed to save notes', 'error');
    }
}

/** Formats datetime for display. */
function formatDateTime(datetime) {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/** Handles file upload for an intern (supports multiple files). */
async function handleFileUpload(internId, input) {
    const files = input.files;
    if (!files || files.length === 0) return;
    
    for (const file of files) {
        try {
            showToast(`Uploading ${file.name}...`, 'info');
            await InternFilesAPI.upload(internId, file);
            showToast(`${file.name} uploaded successfully`);
        } catch (error) {
            showToast(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`, 'error');
        }
    }
    loadInternFiles(internId);
    input.value = '';
}

/** Deletes a file for an intern. */
async function deleteInternFile(internId, fileId) {
    const confirmed = await showConfirmModal({ title: 'Delete File', message: 'Are you sure you want to delete this file?', confirmText: 'Delete', type: 'danger' });
    if (!confirmed) return;
    try {
        await InternFilesAPI.delete(internId, fileId);
        showToast('File deleted successfully');
        loadInternFiles(internId);
    } catch (error) {
        showToast('Failed to delete file', 'error');
    }
}

/** Loads and displays notes for an intern. */
async function loadInternNotes(internId) {
    const container = document.getElementById('intern-notes-list');
    if (!container) return;
    try {
        const notes = await InternNotesAPI.getAll(internId);
        if (notes.length === 0) {
            container.innerHTML = `<div class="empty-state small"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><p>No notes yet</p></div>`;
            return;
        }
        const notesByDate = {};
        notes.forEach(note => {
            if (!notesByDate[note.note_date]) notesByDate[note.note_date] = [];
            notesByDate[note.note_date].push(note);
        });
        container.innerHTML = Object.entries(notesByDate).map(([date, dateNotes]) => `
            <div class="notes-date-group">
                <div class="notes-date-header">${formatDate(date)}</div>
                ${dateNotes.map(note => `
                    <div class="note-item ${note.category}" data-note-id="${note.id}">
                        <div class="note-header">${note.title ? `<div class="note-title">${escapeHtml(note.title)}</div>` : ''}<span class="note-category-badge ${note.category}">${note.category}</span></div>
                        <div class="note-content">${escapeHtml(note.content)}</div>
                        <div class="note-footer">
                            <span class="note-time">${formatTime(note.created_at)}</span>
                            <div class="note-actions">
                                <button class="btn btn-sm btn-ghost" onclick="editInternNote(${internId}, ${note.id})" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                <button class="btn btn-sm btn-ghost btn-danger" onclick="deleteInternNote(${internId}, ${note.id})" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="error-message">Failed to load notes</div>`;
    }
}

/** Shows the add note form. */
function showAddNoteForm(internId) {
    const container = document.getElementById('add-note-form-container');
    const today = new Date().toISOString().split('T')[0];
    container.innerHTML = `
        <div class="add-note-form">
            <div class="form-row">
                <div class="form-group"><label>Date</label><input type="date" id="note-date" value="${today}"></div>
                <div class="form-group"><label>Category</label><select id="note-category"><option value="general">General</option><option value="performance">Performance</option><option value="feedback">Feedback</option><option value="meeting">Meeting</option><option value="goal">Goal</option></select></div>
            </div>
            <div class="form-group"><label>Title (optional)</label><input type="text" id="note-title" placeholder="Note title..."></div>
            <div class="form-group"><label>Content *</label><textarea id="note-content" rows="4" placeholder="Write your note here..."></textarea></div>
            <div class="form-actions"><button class="btn btn-secondary" onclick="hideAddNoteForm()">Cancel</button><button class="btn btn-primary" onclick="saveInternNote(${internId})">Save Note</button></div>
        </div>
    `;
    setTimeout(() => initDateTimePickers(), 50);
}

function hideAddNoteForm() { const c = document.getElementById('add-note-form-container'); if (c) c.innerHTML = ''; }

async function saveInternNote(internId) {
    const date = document.getElementById('note-date').value;
    const category = document.getElementById('note-category').value;
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    if (!content.trim()) { showToast('Note content is required', 'error'); return; }
    try {
        await InternNotesAPI.create(internId, { note_date: date, category, title: title || null, content });
        showToast('Note saved successfully');
        hideAddNoteForm();
        loadInternNotes(internId);
    } catch (error) { showToast('Failed to save note', 'error'); }
}

async function editInternNote(internId, noteId) {
    try {
        const notes = await InternNotesAPI.getAll(internId);
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        const container = document.getElementById('add-note-form-container');
        container.innerHTML = `
            <div class="add-note-form editing">
                <div class="form-row">
                    <div class="form-group"><label>Date</label><input type="date" id="note-date" value="${note.note_date}"></div>
                    <div class="form-group"><label>Category</label><select id="note-category"><option value="general" ${note.category === 'general' ? 'selected' : ''}>General</option><option value="performance" ${note.category === 'performance' ? 'selected' : ''}>Performance</option><option value="feedback" ${note.category === 'feedback' ? 'selected' : ''}>Feedback</option><option value="meeting" ${note.category === 'meeting' ? 'selected' : ''}>Meeting</option><option value="goal" ${note.category === 'goal' ? 'selected' : ''}>Goal</option></select></div>
                </div>
                <div class="form-group"><label>Title (optional)</label><input type="text" id="note-title" value="${escapeHtml(note.title || '')}" placeholder="Note title..."></div>
                <div class="form-group"><label>Content *</label><textarea id="note-content" rows="4">${escapeHtml(note.content)}</textarea></div>
                <div class="form-actions"><button class="btn btn-secondary" onclick="hideAddNoteForm()">Cancel</button><button class="btn btn-primary" onclick="updateInternNote(${internId}, ${noteId})">Update Note</button></div>
            </div>
        `;
        setTimeout(() => initDateTimePickers(), 50);
        container.scrollIntoView({ behavior: 'smooth' });
    } catch (error) { showToast('Failed to load note', 'error'); }
}

async function updateInternNote(internId, noteId) {
    const date = document.getElementById('note-date').value;
    const category = document.getElementById('note-category').value;
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    if (!content.trim()) { showToast('Note content is required', 'error'); return; }
    try {
        await InternNotesAPI.update(internId, noteId, { note_date: date, category, title: title || null, content });
        showToast('Note updated successfully');
        hideAddNoteForm();
        loadInternNotes(internId);
    } catch (error) { showToast('Failed to update note', 'error'); }
}

async function deleteInternNote(internId, noteId) {
    const confirmed = await showConfirmModal({ title: 'Delete Note', message: 'Are you sure you want to delete this note?', confirmText: 'Delete', type: 'danger' });
    if (!confirmed) return;
    try {
        await InternNotesAPI.delete(internId, noteId);
        showToast('Note deleted successfully');
        loadInternNotes(internId);
    } catch (error) { showToast('Failed to delete note', 'error'); }
}

function getFileIcon(fileType) {
    const icons = { pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', jpg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' };
    return icons[fileType] || icons.doc || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}

function getFileIconClass(fileType) {
    const classes = { pdf: 'file-pdf', doc: 'file-doc', docx: 'file-doc', xls: 'file-excel', xlsx: 'file-excel', jpg: 'file-image', jpeg: 'file-image', png: 'file-image', gif: 'file-image', zip: 'file-archive' };
    return classes[fileType] || 'file-default';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTime(datetime) {
    if (!datetime) return '';
    return new Date(datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Deletes an intern.
 * @param {number} id - Intern ID.
 */
async function deleteIntern(id) {
    const confirmed = await showConfirmModal({
        title: 'Delete Minion',
        message: 'Are you sure you want to delete this intern? This action cannot be undone.',
        confirmText: 'Delete',
        type: 'danger'
    });
    
    if (!confirmed) return;

    try {
        await InternsAPI.delete(id);
        showToast('Minion deleted successfully');
        refreshView(AppState.currentView);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// Projects
// ============================================

/**
 * Loads and renders projects.
 */
async function loadProjects() {
    try {
        const statusFilter = document.getElementById('projectStatusFilter')?.value;
        const priorityFilter = document.getElementById('projectPriorityFilter')?.value;
        
        const params = {};
        if (statusFilter) params.status = statusFilter;
        if (priorityFilter) params.priority = priorityFilter;

        const projects = await ProjectsAPI.getAll(params);
        AppState.projects = projects;
        renderProjects(projects);
    } catch (error) {
        showToast('Failed to load projects', 'error');
    }
}

/**
 * Renders the projects list.
 * @param {Array} projects - List of projects.
 */
function renderProjects(projects) {
    const container = document.getElementById('projectsContainer');

    if (!projects.length) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <h3>No projects yet</h3>
                <p>Create your first project to get started</p>
                <button class="btn btn-primary" onclick="showProjectModal()">Create Project</button>
            </div>
        `;
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="project-card">
            <div class="project-header">
                <div>
                    <h3 class="project-title">${escapeHtml(project.name)}</h3>
                    <p class="project-description">${escapeHtml(project.description || 'No description')}</p>
                </div>
                <div class="project-badges">
                    <span class="priority-badge priority-${project.priority}">${project.priority}</span>
                    <span class="status-badge status-${project.status}">${project.status}</span>
                </div>
            </div>
            <div class="project-meta">
                <div class="project-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                    </svg>
                    <span>${project.due_date ? formatDate(project.due_date) : 'No due date'}</span>
                </div>
                <div class="project-meta-item">
                    ${project.assigned_interns?.length ? `
                        <div class="assigned-avatars">
                            ${project.assigned_interns.slice(0, 3).map(intern => `
                                <div class="assigned-avatar ${intern.is_lead ? 'is-lead' : ''}" style="background: ${intern.avatar_color}" title="${escapeHtml(intern.name)}${intern.is_lead ? ' (Lead)' : ''}">
                                    ${getInitials(intern.name)}
                                    ${intern.is_lead ? '<span class="lead-star">&#9733;</span>' : ''}
                                </div>
                            `).join('')}
                            ${project.assigned_interns.length > 3 ? `
                                <div class="assigned-avatar" style="background: var(--bg-overlay); color: var(--text-secondary);">
                                    +${project.assigned_interns.length - 3}
                                </div>
                            ` : ''}
                        </div>
                    ` : '<span>Unassigned</span>'}
                </div>
            </div>
            <div class="progress-section">
                <div class="progress-header">
                    <span>Tasks${project.task_stats?.total > 0 ? ` (${project.task_stats.completed}/${project.task_stats.total})` : ''}</span>
                    <span class="progress-value">${project.task_stats?.progress ?? project.progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.task_stats?.progress ?? project.progress}%"></div>
                </div>
            </div>
            <div class="project-actions">
                <button class="btn btn-secondary btn-sm" onclick="showProjectModal(${project.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProject(${project.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Shows project details in a modal.
 * @param {number} id - Project ID.
 */
async function showProjectDetail(id) {
    if (!id) {
        showToast('Invalid project ID', 'error');
        return;
    }
    
    try {
        const project = await ProjectsAPI.getById(id);
        
        if (!project) {
            showToast('Project not found', 'error');
            return;
        }
        
        const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
        const priorityColor = priorityColors[project.priority] || priorityColors.medium;
        const interns = project.interns || project.assigned_interns || [];
        const lead = interns.find(i => i.is_lead);
        
        elements.modalTitle.textContent = escapeHtml(project.name);
        elements.modalBody.innerHTML = `
            <div class="project-detail-modal">
                <div class="project-detail-header">
                    <span class="status-badge status-${project.status || 'pending'}">${project.status || 'pending'}</span>
                    <span class="priority-badge" style="background: ${priorityColor}20; color: ${priorityColor}">
                        ${project.priority || 'medium'} priority
                    </span>
                </div>
                
                ${project.description ? `
                <div class="project-detail-section">
                    <h4>Description</h4>
                    <p>${escapeHtml(project.description)}</p>
                </div>
                ` : ''}
                
                <div class="project-detail-grid">
                    <div class="project-detail-item">
                        <span class="project-detail-label">Start Date</span>
                        <span class="project-detail-value">${formatDate(project.start_date) || 'Not set'}</span>
                    </div>
                    <div class="project-detail-item">
                        <span class="project-detail-label">Deadline</span>
                        <span class="project-detail-value">${formatDate(project.deadline) || 'Not set'}</span>
                    </div>
                    <div class="project-detail-item">
                        <span class="project-detail-label">Created</span>
                        <span class="project-detail-value">${formatDate(project.created_at)}</span>
                    </div>
                    <div class="project-detail-item">
                        <span class="project-detail-label">Last Updated</span>
                        <span class="project-detail-value">${formatDate(project.updated_at)}</span>
                    </div>
                </div>
                
                <div class="project-detail-section">
                    <h4>Task Completion</h4>
                    <div class="progress-section" style="margin-top: 0.5rem;">
                        <div class="progress-header">
                            <span>${project.task_stats?.total > 0 
                                ? `${project.task_stats.completed} of ${project.task_stats.total} tasks completed` 
                                : 'No tasks assigned'}</span>
                            <span class="progress-value">${project.task_stats?.progress ?? 0}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${project.task_stats?.progress ?? 0}%"></div>
                        </div>
                    </div>
                </div>
                
                ${interns.length > 0 ? `
                <div class="project-detail-section">
                    <h4>Assigned Minions (${interns.length})</h4>
                    <div class="project-detail-interns">
                        ${interns.map(intern => `
                            <div class="project-intern-item ${intern.is_lead ? 'is-lead' : ''}" onclick="closeModal(); showInternDetail(${intern.id});">
                                <div class="intern-avatar" style="background: ${intern.avatar_color || '#6366f1'}">
                                    ${getInitials(intern.name)}
                                </div>
                                <div class="intern-info">
                                    <span class="intern-name">${escapeHtml(intern.name)}</span>
                                    ${intern.is_lead ? '<span class="lead-badge">Lead</span>' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : '<div class="project-detail-section"><p class="text-muted">No interns assigned</p></div>'}
                
                <div class="project-detail-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                    <button class="btn btn-primary" onclick="closeModal(); showProjectModal(${project.id});">Edit Project</button>
                </div>
            </div>
        `;
        
        openModal();
    } catch (error) {
        showToast('Failed to load project details', 'error');
    }
}

/**
 * Shows the project creation/edit modal.
 * @param {number|null} id - Project ID for editing, or null for new.
 */
async function showProjectModal(id = null) {
    const isEdit = id !== null;
    let project = null;

    try {
        const interns = await InternsAPI.getAll({ status: 'active' });
        
        if (isEdit) {
            project = await ProjectsAPI.getById(id);
        }

        const assignedIds = project?.assigned_interns?.map(i => i.id) || [];
        const leadId = project?.assigned_interns?.find(i => i.is_lead)?.id || null;

        elements.modalTitle.textContent = isEdit ? 'Edit Project' : 'Create New Project';
        elements.modalBody.innerHTML = `
            <form id="projectForm">
                <div class="form-group">
                    <label>Project Name *</label>
                    <input type="text" name="name" required value="${project?.name || ''}" placeholder="Enter project name">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" placeholder="Describe the project...">${project?.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Status</label>
                        <select name="status">
                            <option value="pending" ${project?.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="active" ${project?.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="completed" ${project?.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="onhold" ${project?.status === 'onhold' ? 'selected' : ''}>On Hold</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Priority</label>
                        <select name="priority">
                            <option value="low" ${project?.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${project?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${project?.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Start Date</label>
                        <input type="date" name="start_date" value="${project?.start_date || ''}">
                    </div>
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" name="due_date" value="${project?.due_date || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Progress (%)</label>
                    <input type="number" name="progress" min="0" max="100" value="${project?.progress || 0}">
                </div>
                <div class="form-group">
                    <label>Assign Minions</label>
                    <p class="form-hint">Click to assign, star to designate as project lead</p>
                    <div class="intern-assignment-list" id="internAssignments">
                        ${interns.map(intern => `
                            <div class="intern-assignment-item ${assignedIds.includes(intern.id) ? 'assigned' : ''}" data-intern-id="${intern.id}">
                                <input type="checkbox" class="intern-checkbox" name="intern_ids" value="${intern.id}" ${assignedIds.includes(intern.id) ? 'checked' : ''}>
                                <div class="intern-avatar" style="background: ${intern.avatar_color}">${getInitials(intern.name)}</div>
                                <div class="intern-info">
                                    <div class="intern-name">${escapeHtml(intern.name)}</div>
                                    <div class="intern-role">${escapeHtml(intern.department || intern.role || 'Intern')}</div>
                                </div>
                                <div class="intern-actions">
                                    <button type="button" class="lead-toggle ${leadId === intern.id ? 'is-lead' : ''}" 
                                            title="Set as project lead" data-intern-id="${intern.id}">
                                        <svg viewBox="0 0 24 24" fill="${leadId === intern.id ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                        </svg>
                                    </button>
                                    <div class="assign-check">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        `).join('') || '<div class="empty-state small"><p>No active interns available</p></div>'}
                    </div>
                    <input type="hidden" name="lead_id" id="leadIdInput" value="${leadId || ''}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Project</button>
                </div>
            </form>
        `;

        // Add intern assignment toggle behavior
        document.querySelectorAll('.intern-assignment-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const internId = item.dataset.internId;
            
            // Toggle assignment on entire card click
            item.addEventListener('click', (e) => {
                // Don't toggle if clicking the lead button
                if (e.target.closest('.lead-toggle')) return;
                
                checkbox.checked = !checkbox.checked;
                item.classList.toggle('assigned', checkbox.checked);
                
                // If unchecked and was lead, remove lead status
                if (!checkbox.checked) {
                    const leadInput = document.getElementById('leadIdInput');
                    if (leadInput.value === internId) {
                        leadInput.value = '';
                        item.querySelector('.lead-toggle').classList.remove('is-lead');
                        item.querySelector('.lead-toggle svg').setAttribute('fill', 'none');
                    }
                }
            });
        });

        // Add lead toggle behavior
        document.querySelectorAll('.lead-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const internId = btn.dataset.internId;
                const item = btn.closest('.intern-assignment-item');
                const checkbox = item.querySelector('input[type="checkbox"]');
                const leadInput = document.getElementById('leadIdInput');
                
                // Must be assigned to be lead
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    item.classList.add('assigned');
                }
                
                // Toggle lead status
                const isCurrentLead = leadInput.value === internId;
                
                // Remove lead from all
                document.querySelectorAll('.lead-toggle').forEach(b => {
                    b.classList.remove('is-lead');
                    b.querySelector('svg').setAttribute('fill', 'none');
                });
                
                if (!isCurrentLead) {
                    // Set new lead
                    leadInput.value = internId;
                    btn.classList.add('is-lead');
                    btn.querySelector('svg').setAttribute('fill', 'currentColor');
                } else {
                    // Remove lead
                    leadInput.value = '';
                }
            });
        });

        document.getElementById('projectForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const leadId = formData.get('lead_id');
            
            const data = {
                name: formData.get('name'),
                description: formData.get('description'),
                status: formData.get('status'),
                priority: formData.get('priority'),
                start_date: formData.get('start_date'),
                due_date: formData.get('due_date'),
                progress: parseInt(formData.get('progress')) || 0,
                intern_ids: formData.getAll('intern_ids').map(Number),
                lead_id: leadId ? parseInt(leadId) : null
            };

            try {
                if (isEdit) {
                    await ProjectsAPI.update(id, data);
                    showToast('Project updated successfully');
                } else {
                    await ProjectsAPI.create(data);
                    showToast('Project created successfully');
                }
                closeModal();
                refreshView(AppState.currentView);
            } catch (error) {
                showToast(error.message, 'error');
            }
        });

        openModal();
    } catch (error) {
        showToast('Failed to load project data', 'error');
    }
}

/**
 * Deletes a project.
 * @param {number} id - Project ID.
 */
async function deleteProject(id) {
    const confirmed = await showConfirmModal({
        title: 'Delete Project',
        message: 'Are you sure you want to delete this project? All associated tasks will also be removed.',
        confirmText: 'Delete',
        type: 'danger'
    });
    
    if (!confirmed) return;

    try {
        await ProjectsAPI.delete(id);
        showToast('Project deleted successfully');
        refreshView(AppState.currentView);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// Tasks
// ============================================

/**
 * Loads and renders tasks.
 */
async function loadTasks() {
    try {
        const [tasks, interns, projects] = await Promise.all([
            TasksAPI.getAll(),
            InternsAPI.getAll(),
            ProjectsAPI.getAll()
        ]);

        AppState.tasks = tasks;
        AppState.interns = interns;
        AppState.projects = projects;

        // Populate filters
        populateTaskFilters(interns, projects);
        renderTasks(tasks);
    } catch (error) {
        showToast('Failed to load tasks', 'error');
    }
}

/**
 * Refreshes the custom dropdown options to match the native select options.
 * @param {HTMLSelectElement} select - The native select element.
 */
function refreshCustomDropdown(select) {
    const wrapper = select.closest('.custom-select-wrapper');
    if (!wrapper) return;

    const dropdown = wrapper.querySelector('.custom-select-dropdown');
    const trigger = wrapper.querySelector('.custom-select-trigger');
    if (!dropdown || !trigger) return;

    // Clear existing custom options
    dropdown.innerHTML = '';

    // Rebuild custom options from native select
    Array.from(select.options).forEach((option, index) => {
        const customOption = document.createElement('div');
        customOption.className = 'custom-select-option';
        if (index === select.selectedIndex) {
            customOption.classList.add('selected');
        }
        customOption.textContent = option.text;
        customOption.dataset.value = option.value;

        customOption.addEventListener('click', (e) => {
            e.stopPropagation();
            // Update native select
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));

            // Update trigger text
            trigger.textContent = option.text;

            // Update selected state
            dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            customOption.classList.add('selected');

            // Close dropdown
            wrapper.classList.remove('open');
        });

        dropdown.appendChild(customOption);
    });

    // Update trigger text
    trigger.textContent = select.options[select.selectedIndex]?.text || 'Select...';
}

/**
 * Populates task filter dropdowns.
 * @param {Array} interns - List of interns.
 * @param {Array} projects - List of projects.
 */
function populateTaskFilters(interns, projects) {
    const internFilter = document.getElementById('taskInternFilter');
    const projectFilter = document.getElementById('taskProjectFilter');

    if (internFilter) {
        // Clear existing options except the first "All" option
        while (internFilter.options.length > 1) {
            internFilter.remove(1);
        }
        // Add intern options
        interns.forEach(intern => {
            const option = document.createElement('option');
            option.value = intern.id;
            option.textContent = intern.name;
            internFilter.appendChild(option);
        });
        // Refresh the custom dropdown to show new options
        refreshCustomDropdown(internFilter);
    }

    if (projectFilter) {
        // Clear existing options except the first "All" option
        while (projectFilter.options.length > 1) {
            projectFilter.remove(1);
        }
        // Add project options
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectFilter.appendChild(option);
        });
        // Refresh the custom dropdown to show new options
        refreshCustomDropdown(projectFilter);
    }
}

/**
 * Renders the tasks kanban board with drag and drop support.
 * @param {Array} tasks - List of tasks.
 */
function renderTasks(tasks) {
    const statuses = ['pending', 'in_progress', 'completed'];

    statuses.forEach(status => {
        const column = document.getElementById(`tasks-${status}`);
        // Filter tasks by status and sort by sort_order to maintain correct ordering
        const statusTasks = tasks
            .filter(t => t.status === status)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const countEl = document.querySelector(`.task-column[data-status="${status}"] .column-count`);
        
        if (countEl) countEl.textContent = statusTasks.length;

        if (!statusTasks.length) {
            column.innerHTML = '<div class="empty-state small drop-zone"><p>No tasks</p></div>';
            return;
        }

        column.innerHTML = statusTasks.map(task => {
            const intern = AppState.interns.find(i => i.id === task.intern_id);
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

            return `
                <div class="task-item" 
                     draggable="true" 
                     data-task-id="${task.id}"
                     data-task-status="${task.status}">
                    <div class="task-item-header">
                        <h4>${escapeHtml(task.title)}</h4>
                        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    </div>
                    <div class="task-item-meta">
                        <div class="task-assignee">
                            ${intern ? `
                                <div class="task-assignee-avatar" style="background: ${intern.avatar_color}">
                                    ${getInitials(intern.name)}
                                </div>
                                <span>${escapeHtml(intern.name)}</span>
                            ` : '<span>Unassigned</span>'}
                        </div>
                        ${task.due_date ? `
                            <span class="task-due ${isOverdue ? 'overdue' : ''}">${formatDate(task.due_date)}</span>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    });

    // Initialize drag and drop after rendering
    initTaskDragAndDrop();
}

/**
 * Currently dragged task element reference.
 */
let draggedTask = null;

/**
 * Tracks if a drag operation occurred to prevent click from firing.
 */
let taskDragOccurred = false;

/**
 * Tracks if column drop zone listeners have been initialized.
 */
let columnListenersInitialized = false;

/**
 * Initializes drag and drop functionality for task items.
 * Column listeners are only attached once; task item listeners are re-attached on each render.
 */
function initTaskDragAndDrop() {
    const taskItems = document.querySelectorAll('.task-item[draggable="true"]');
    const columns = document.querySelectorAll('.task-column-body');

    // Task item drag events (re-attached each render since items are recreated)
    taskItems.forEach(item => {
        item.addEventListener('dragstart', handleTaskDragStart);
        item.addEventListener('dragend', handleTaskDragEnd);
        item.addEventListener('click', handleTaskClick);
    });

    // Column drop zone events - only attach once to avoid duplicate handlers
    if (!columnListenersInitialized) {
        columns.forEach(column => {
            column.addEventListener('dragover', handleTaskDragOver);
            column.addEventListener('dragenter', handleTaskDragEnter);
            column.addEventListener('dragleave', handleTaskDragLeave);
            column.addEventListener('drop', handleTaskDrop);
        });
        columnListenersInitialized = true;
    }
}

/**
 * Handles click on a task item - opens modal if no drag occurred.
 * @param {MouseEvent} e - The click event.
 */
function handleTaskClick(e) {
    // Don't open modal if we just finished dragging
    if (taskDragOccurred) {
        taskDragOccurred = false;
        return;
    }
    
    const taskId = parseInt(this.dataset.taskId);
    if (taskId) {
        showTaskModal(taskId);
    }
}

/**
 * Handles the start of a task drag operation.
 * @param {DragEvent} e - The drag event.
 */
function handleTaskDragStart(e) {
    draggedTask = this;
    taskDragOccurred = true;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.taskId);
    
    // Add dragging class to body for global styling
    document.body.classList.add('task-dragging');
}

/**
 * Handles the end of a task drag operation.
 * @param {DragEvent} e - The drag event.
 */
function handleTaskDragEnd(e) {
    this.classList.remove('dragging');
    document.body.classList.remove('task-dragging');
    
    // Remove all drag-over states
    document.querySelectorAll('.task-column-body').forEach(col => {
        col.classList.remove('drag-over');
    });
    
    draggedTask = null;
    
    // Reset drag flag after a short delay to allow click handler to check it
    setTimeout(() => {
        taskDragOccurred = false;
    }, 100);
}

/**
 * Handles dragging over a valid drop target.
 * Moves the dragged element in real-time for visual feedback.
 * @param {DragEvent} e - The drag event.
 */
function handleTaskDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const draggingItem = document.querySelector('.task-item.dragging');
    if (!draggingItem) return;
    
    // Remove empty state if present (when dragging into empty column)
    const emptyState = this.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    const afterElement = getDragAfterElement(this, e.clientY);
    
    // Move the dragged element in the DOM for real-time visual feedback
    if (afterElement == null) {
        // Append to end of column
        if (this.lastElementChild !== draggingItem) {
            this.appendChild(draggingItem);
        }
    } else if (afterElement !== draggingItem) {
        // Insert before the target element
        this.insertBefore(draggingItem, afterElement);
    }
}

/**
 * Handles entering a drop zone.
 * @param {DragEvent} e - The drag event.
 */
function handleTaskDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

/**
 * Handles leaving a drop zone.
 * @param {DragEvent} e - The drag event.
 */
function handleTaskDragLeave(e) {
    // Only remove drag-over if we're leaving the column entirely
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

/**
 * Handles dropping a task onto a column.
 * Updates task status and order, persisting to the database.
 * @param {DragEvent} e - The drag event.
 */
async function handleTaskDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    const taskId = parseInt(e.dataTransfer.getData('text/plain'));
    const newStatus = this.closest('.task-column').dataset.status;
    const task = AppState.tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    // Update local state for the dragged task's status
    const oldStatus = task.status;
    task.status = newStatus;
    
    // Add empty state to any columns that are now empty
    updateEmptyColumnStates();
    
    // Update column counts
    updateTaskColumnCounts();
    
    // Get the new order from DOM and save to database
    await saveTaskOrderFromDOM();
    
    // Show feedback if status changed
    if (oldStatus !== newStatus) {
        showToast(`Task moved to ${newStatus.replace('_', ' ')}`, 'success');
    }
}

/**
 * Updates empty state display for all task columns.
 * Adds empty state to columns with no tasks, removes it from columns with tasks.
 */
function updateEmptyColumnStates() {
    const statuses = ['pending', 'in_progress', 'completed'];
    
    statuses.forEach(status => {
        const column = document.getElementById(`tasks-${status}`);
        if (!column) return;
        
        const taskItems = column.querySelectorAll('.task-item');
        const emptyState = column.querySelector('.empty-state');
        
        if (taskItems.length === 0 && !emptyState) {
            // Add empty state if no tasks and no empty state exists
            column.innerHTML = '<div class="empty-state small drop-zone"><p>No tasks</p></div>';
        }
    });
}

/**
 * Updates the task count badges in column headers.
 */
function updateTaskColumnCounts() {
    const statuses = ['pending', 'in_progress', 'completed'];
    
    statuses.forEach(status => {
        const column = document.getElementById(`tasks-${status}`);
        if (!column) return;
        
        const taskCount = column.querySelectorAll('.task-item').length;
        const countEl = document.querySelector(`.task-column[data-status="${status}"] .column-count`);
        
        if (countEl) {
            countEl.textContent = taskCount;
        }
    });
}

/**
 * Reads task order from DOM and saves to database.
 * Updates both local state and persists to backend.
 */
async function saveTaskOrderFromDOM() {
    const tasksToUpdate = [];
    const statuses = ['pending', 'in_progress', 'completed'];
    
    statuses.forEach(status => {
        const column = document.getElementById(`tasks-${status}`);
        if (!column) return;
        
        const taskItems = column.querySelectorAll('.task-item[data-task-id]');
        taskItems.forEach((item, index) => {
            const taskId = parseInt(item.dataset.taskId);
            const task = AppState.tasks.find(t => t.id === taskId);
            if (task) {
                // Update local state
                task.status = status;
                task.sort_order = index;
                
                // Add to update list
                tasksToUpdate.push({
                    id: taskId,
                    status: status,
                    sort_order: index
                });
            }
        });
    });
    
    // Skip API call if nothing to update
    if (tasksToUpdate.length === 0) {
        return;
    }
    
    // Save to database
    try {
        await TasksAPI.reorder(tasksToUpdate);
    } catch (error) {
        console.error('Failed to save task order:', error);
        console.error('Tasks that failed to save:', tasksToUpdate);
        showToast('Failed to save task order', 'error');
        // Reload tasks to revert to server state
        loadTasks();
    }
}

/**
 * Determines which element the dragged item should be placed after.
 * @param {HTMLElement} container - The container element.
 * @param {number} y - The current Y position of the mouse.
 * @returns {HTMLElement|null} The element to insert after, or null for end.
 */
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Shows the task creation/edit modal.
 * @param {number|null} id - Task ID for editing, or null for new.
 */
async function showTaskModal(id = null) {
    const isEdit = id !== null;
    let task = null;

    if (isEdit) {
        task = AppState.tasks.find(t => t.id === id);
    }

    elements.modalTitle.textContent = isEdit ? 'Edit Task' : 'Create New Task';
    elements.modalBody.innerHTML = `
        <form id="taskForm">
            <div class="form-group">
                <label>Task Title *</label>
                <input type="text" name="title" required value="${task?.title || ''}" placeholder="Enter task title">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="Describe the task...">${task?.description || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Status</label>
                    <select name="status">
                        <option value="pending" ${task?.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in_progress" ${task?.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${task?.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select name="priority">
                        <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Assign To</label>
                    <select name="intern_id">
                        <option value="">Unassigned</option>
                        ${AppState.interns.map(i => `
                            <option value="${i.id}" ${task?.intern_id === i.id ? 'selected' : ''}>${escapeHtml(i.name)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Project</label>
                    <select name="project_id">
                        <option value="">No Project</option>
                        ${AppState.projects.map(p => `
                            <option value="${p.id}" ${task?.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Due Date</label>
                <input type="date" name="due_date" value="${task?.due_date || ''}">
            </div>
            <div class="form-actions">
                ${isEdit ? '<button type="button" class="btn btn-danger" onclick="deleteTask(' + id + ')">Delete</button>' : ''}
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Task</button>
            </div>
        </form>
    `;

    document.getElementById('taskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            status: formData.get('status'),
            priority: formData.get('priority'),
            intern_id: formData.get('intern_id') || null,
            project_id: formData.get('project_id') || null,
            due_date: formData.get('due_date') || null
        };

        try {
            if (isEdit) {
                await TasksAPI.update(id, data);
                showToast('Task updated successfully');
            } else {
                await TasksAPI.create(data);
                showToast('Task created successfully');
            }
            closeModal();
            refreshView(AppState.currentView);
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    openModal();
}

/**
 * Deletes a task.
 * @param {number} id - Task ID.
 */
async function deleteTask(id) {
    const confirmed = await showConfirmModal({
        title: 'Delete Task',
        message: 'Are you sure you want to delete this task?',
        confirmText: 'Delete',
        type: 'danger'
    });
    
    if (!confirmed) return;

    try {
        await TasksAPI.delete(id);
        showToast('Task deleted successfully');
        closeModal();
        refreshView(AppState.currentView);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// Schedule
// ============================================

/**
 * Loads and renders the schedule view.
 */
async function loadSchedule() {
    try {
        const events = await EventsAPI.getAll();
        AppState.events = events;
        renderCalendar();
        renderEvents(AppState.selectedDate);
    } catch (error) {
        showToast('Failed to load schedule', 'error');
    }
}

/**
 * Gets events for a specific date, sorted by start time.
 * @param {string} dateStr - Date string (YYYY-MM-DD).
 * @returns {Array} Sorted array of events.
 */
function getEventsForDate(dateStr) {
    return AppState.events
        .filter(e => e.event_date === dateStr)
        .sort((a, b) => {
            // Sort by start_time, events without time go to the end
            if (!a.start_time && !b.start_time) return 0;
            if (!a.start_time) return 1;
            if (!b.start_time) return -1;
            return a.start_time.localeCompare(b.start_time);
        });
}

/**
 * Generates event indicators HTML for a calendar day.
 * @param {Array} events - Array of events for the day.
 * @returns {string} HTML string for event indicators.
 */
function generateEventIndicators(events) {
    if (!events || events.length === 0) return '';
    
    // Show up to 4 event indicators, then a "+N" indicator
    const maxVisible = 4;
    const visibleEvents = events.slice(0, maxVisible);
    const remainingCount = events.length - maxVisible;
    
    let html = '<div class="calendar-events">';
    
    visibleEvents.forEach(event => {
        const color = event.color || '#6366f1';
        const title = escapeHtml(event.title);
        const time = event.start_time ? formatTimeDisplay(event.start_time) : 'All day';
        html += `<div class="calendar-event-indicator" style="background: ${color}" title="${time} - ${title}"></div>`;
    });
    
    if (remainingCount > 0) {
        html += `<div class="calendar-event-more">+${remainingCount}</div>`;
    }
    
    html += '</div>';
    return html;
}

/**
 * Renders the calendar.
 */
function renderCalendar() {
    const container = document.getElementById('calendar');
    const monthDisplay = document.getElementById('currentMonth');
    
    const year = AppState.calendarDate.getFullYear();
    const month = AppState.calendarDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    monthDisplay.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const selectedStr = AppState.selectedDate.toISOString().split('T')[0];

    // Build map of events by date for quick lookup
    const eventsByDate = {};
    AppState.events.forEach(event => {
        if (!eventsByDate[event.event_date]) {
            eventsByDate[event.event_date] = [];
        }
        eventsByDate[event.event_date].push(event);
    });
    
    // Sort events by start time for each date
    Object.keys(eventsByDate).forEach(dateKey => {
        eventsByDate[dateKey].sort((a, b) => {
            if (!a.start_time && !b.start_time) return 0;
            if (!a.start_time) return 1;
            if (!b.start_time) return -1;
            return a.start_time.localeCompare(b.start_time);
        });
    });

    let html = `
        <div class="calendar-header">Sun</div>
        <div class="calendar-header">Mon</div>
        <div class="calendar-header">Tue</div>
        <div class="calendar-header">Wed</div>
        <div class="calendar-header">Thu</div>
        <div class="calendar-header">Fri</div>
        <div class="calendar-header">Sat</div>
    `;

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedStr;
        const dayEvents = eventsByDate[dateStr] || [];
        const hasEvents = dayEvents.length > 0;

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (hasEvents) classes += ' has-events';

        const eventIndicators = generateEventIndicators(dayEvents);

        html += `<div class="${classes}" onclick="selectDate('${dateStr}')">
            <span class="day-number">${day}</span>
            ${eventIndicators}
        </div>`;
    }

    // Next month days
    const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (startDayOfWeek + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
    }

    container.innerHTML = html;
}

/**
 * Selects a date on the calendar.
 * @param {string} dateStr - Date string (YYYY-MM-DD).
 */
function selectDate(dateStr) {
    AppState.selectedDate = new Date(dateStr);
    renderCalendar();
    renderEvents(AppState.selectedDate);
}

/**
 * Renders events for a selected date.
 * @param {Date} date - The selected date.
 */
function renderEvents(date) {
    const container = document.getElementById('eventsList');
    const titleEl = document.getElementById('selectedDateTitle');
    
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    titleEl.textContent = dateStr === today ? "Today's Events" : `Events for ${formatDate(dateStr)}`;
    
    const dayEvents = AppState.events.filter(e => e.event_date === dateStr);

    if (!dayEvents.length) {
        container.innerHTML = `
            <div class="empty-state small">
                <p>No events for this date</p>
            </div>
        `;
        return;
    }

    container.innerHTML = dayEvents.map(event => {
        // Get intern display text
        const assignedInterns = event.assigned_interns || [];
        let internDisplay = 'No assignees';
        if (assignedInterns.length === 1) {
            internDisplay = escapeHtml(assignedInterns[0].name);
        } else if (assignedInterns.length === 2) {
            internDisplay = `${escapeHtml(assignedInterns[0].name)} & ${escapeHtml(assignedInterns[1].name)}`;
        } else if (assignedInterns.length > 2) {
            internDisplay = `${escapeHtml(assignedInterns[0].name)} +${assignedInterns.length - 1} more`;
        }
        
        const eventColor = event.color || '#6366f1';
        
        return `
            <div class="event-item ${event.event_type}" onclick="showEventModal(${event.id})" style="border-left-color: ${eventColor}">
                <div class="event-color-dot" style="background: ${eventColor}"></div>
                <div class="event-content">
                    <div class="event-time">${event.start_time || 'All day'}</div>
                    <div class="event-title">${escapeHtml(event.title)}</div>
                    <div class="event-meta">${internDisplay}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Predefined event colors for quick selection
const EVENT_COLORS = [
    { name: 'Purple', value: '#6366f1' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Green', value: '#10b981' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Gray', value: '#6b7280' }
];

/**
 * Shows the event creation/edit modal.
 * @param {number|null} id - Event ID for editing, or null for new.
 */
async function showEventModal(id = null) {
    const isEdit = id !== null;
    let event = null;

    if (isEdit) {
        event = AppState.events.find(e => e.id === id);
    }

    const interns = AppState.interns.length ? AppState.interns : await InternsAPI.getAll();
    const defaultDate = AppState.selectedDate.toISOString().split('T')[0];
    
    // Get assigned intern IDs for this event
    const assignedIds = event?.assigned_interns?.map(i => i.id) || [];
    const currentColor = event?.color || '#6366f1';

    elements.modalTitle.textContent = isEdit ? 'Edit Event' : 'Add New Event';
    elements.modalBody.innerHTML = `
        <form id="eventForm">
            <div class="form-group">
                <label>Event Title *</label>
                <input type="text" name="title" required value="${event?.title || ''}" placeholder="Enter event title">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" name="event_date" required value="${event?.event_date || defaultDate}">
                </div>
                <div class="form-group">
                    <label>Event Type</label>
                    <select name="event_type">
                        <option value="meeting" ${event?.event_type === 'meeting' ? 'selected' : ''}>Meeting</option>
                        <option value="deadline" ${event?.event_type === 'deadline' ? 'selected' : ''}>Deadline</option>
                        <option value="review" ${event?.event_type === 'review' ? 'selected' : ''}>Review</option>
                        <option value="school" ${event?.event_type === 'school' ? 'selected' : ''}>School</option>
                        <option value="other" ${event?.event_type === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Event Color</label>
                <div class="color-picker-grid">
                    ${EVENT_COLORS.map(c => `
                        <button type="button" class="color-option ${currentColor === c.value ? 'selected' : ''}" 
                                data-color="${c.value}" style="background: ${c.value}" title="${c.name}">
                            ${currentColor === c.value ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
                        </button>
                    `).join('')}
                </div>
                <input type="hidden" name="color" value="${currentColor}">
            </div>
            ${!isEdit ? `
            <div class="form-group recurrence-group">
                <label>Repeat Event</label>
                <div class="form-row">
                    <div class="form-group" style="flex: 2">
                        <select name="recurrence_type" id="recurrenceType">
                            <option value="none">Does not repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Every 2 weeks</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div class="form-group recurrence-count-group" style="flex: 1; display: none;">
                        <input type="number" name="recurrence_count" min="1" max="52" value="1" placeholder="Times">
                        <span class="input-suffix">times</span>
                    </div>
                </div>
            </div>
            ` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label>Start Time</label>
                    <input type="time" name="start_time" value="${event?.start_time || ''}">
                </div>
                <div class="form-group">
                    <label>End Time</label>
                    <input type="time" name="end_time" value="${event?.end_time || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Location</label>
                <input type="text" name="location" value="${event?.location || ''}" placeholder="Meeting room, Zoom link, etc.">
            </div>
            <div class="form-group">
                <label>Assign Minions</label>
                <p class="form-hint">Click to select interns for this event</p>
                <div class="intern-assignment-list">
                    ${interns.length === 0 ? '<p class="empty-state-text">No interns available</p>' : ''}
                    ${interns.map(intern => `
                        <div class="intern-assignment-item ${assignedIds.includes(intern.id) ? 'assigned' : ''}" data-intern-id="${intern.id}">
                            <input type="checkbox" class="intern-checkbox" name="intern_ids" value="${intern.id}" ${assignedIds.includes(intern.id) ? 'checked' : ''}>
                            <div class="intern-avatar" style="background: ${intern.avatar_color}">${getInitials(intern.name)}</div>
                            <div class="intern-info">
                                <div class="intern-name">${escapeHtml(intern.name)}</div>
                                <div class="intern-role">${escapeHtml(intern.department || intern.role || 'Intern')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="Event details...">${event?.description || ''}</textarea>
            </div>
            <div class="form-actions">
                ${isEdit ? '<button type="button" class="btn btn-danger" onclick="deleteEvent(' + id + ')">Delete</button>' : ''}
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Event</button>
            </div>
        </form>
    `;

    // Color picker click handlers
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(b => {
                b.classList.remove('selected');
                b.innerHTML = '';
            });
            btn.classList.add('selected');
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            document.querySelector('input[name="color"]').value = btn.dataset.color;
        });
    });

    // Recurrence type change handler
    const recurrenceType = document.getElementById('recurrenceType');
    const recurrenceCountGroup = document.querySelector('.recurrence-count-group');
    if (recurrenceType && recurrenceCountGroup) {
        recurrenceType.addEventListener('change', () => {
            if (recurrenceType.value === 'none') {
                recurrenceCountGroup.style.display = 'none';
            } else {
                recurrenceCountGroup.style.display = 'flex';
            }
        });
    }

    // Add click handlers for intern assignment items
    document.querySelectorAll('#eventForm .intern-assignment-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't toggle if clicking directly on the checkbox (it handles itself)
            if (e.target.type === 'checkbox') return;
            
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            item.classList.toggle('assigned', checkbox.checked);
        });
        
        // Also listen for direct checkbox changes
        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            item.classList.toggle('assigned', checkbox.checked);
        });
    });

    document.getElementById('eventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const data = {
            title: formData.get('title'),
            event_date: formData.get('event_date'),
            event_type: formData.get('event_type'),
            start_time: formData.get('start_time') || null,
            end_time: formData.get('end_time') || null,
            location: formData.get('location') || null,
            intern_ids: formData.getAll('intern_ids').map(Number),
            description: formData.get('description') || null,
            color: formData.get('color')
        };

        // Add recurrence fields for new events
        if (!isEdit) {
            data.recurrence_type = formData.get('recurrence_type') || 'none';
            data.recurrence_count = parseInt(formData.get('recurrence_count')) || 1;
        }

        try {
            if (isEdit) {
                await EventsAPI.update(id, data);
                showToast('Event updated successfully');
            } else {
                const result = await EventsAPI.create(data);
                if (result.created_count > 1) {
                    showToast(`Created ${result.created_count} recurring events`);
                } else {
                    showToast('Event added successfully');
                }
            }
            closeModal();
            refreshView(AppState.currentView);
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    openModal();
}

/**
 * Deletes an event, with options for recurring events.
 * @param {number} id - Event ID.
 */
async function deleteEvent(id) {
    // Find the event to check if it's recurring
    const event = AppState.events.find(e => e.id === id);
    const isRecurring = event && (event.recurrence_parent_id || (event.recurrence_type && event.recurrence_type !== 'none'));
    
    if (isRecurring) {
        // Show recurring event deletion options
        const result = await showRecurringDeleteModal(event);
        if (!result) return;
        
        try {
            const response = await EventsAPI.delete(id, { deleteAll: result === 'all' });
            showToast(response.message || 'Event deleted successfully');
            closeModal();
            refreshView(AppState.currentView);
        } catch (error) {
            showToast(error.message, 'error');
        }
    } else {
        // Regular single event deletion
        const confirmed = await showConfirmModal({
            title: 'Delete Event',
            message: 'Are you sure you want to delete this event?',
            confirmText: 'Delete',
            type: 'danger'
        });
        
        if (!confirmed) return;

        try {
            await EventsAPI.delete(id);
            showToast('Event deleted successfully');
            closeModal();
            refreshView(AppState.currentView);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

/**
 * Shows a modal for deleting recurring events with options.
 * @param {Object} event - The event object.
 * @returns {Promise<string|null>} 'single', 'all', or null if cancelled.
 */
function showRecurringDeleteModal(event) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('recurringDeleteOverlay');
        const eventTitle = document.getElementById('recurringDeleteEventTitle');
        const singleBtn = document.getElementById('deleteRecurringSingle');
        const allBtn = document.getElementById('deleteRecurringAll');
        const cancelBtn = document.getElementById('deleteRecurringCancel');
        
        eventTitle.textContent = event.title;
        overlay.classList.add('active');
        
        const cleanup = () => {
            overlay.classList.remove('active');
            singleBtn.removeEventListener('click', handleSingle);
            allBtn.removeEventListener('click', handleAll);
            cancelBtn.removeEventListener('click', handleCancel);
            overlay.removeEventListener('click', handleOverlayClick);
        };
        
        const handleSingle = () => {
            cleanup();
            resolve('single');
        };
        
        const handleAll = () => {
            cleanup();
            resolve('all');
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(null);
        };
        
        const handleOverlayClick = (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(null);
            }
        };
        
        singleBtn.addEventListener('click', handleSingle);
        allBtn.addEventListener('click', handleAll);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleOverlayClick);
    });
}

// ============================================
// Reports
// ============================================

/**
 * Loads and renders weekly reports.
 */
async function loadReports() {
    try {
        const internFilter = document.getElementById('reportInternFilter')?.value;
        const params = internFilter ? { intern_id: internFilter } : {};

        const [reports, interns] = await Promise.all([
            ReportsAPI.getAll(params),
            InternsAPI.getAll()
        ]);

        AppState.reports = reports;
        AppState.interns = interns;

        // Populate filter dropdown
        const filterEl = document.getElementById('reportInternFilter');
        if (filterEl) {
            // Clear existing options except the first "All" option
            while (filterEl.options.length > 1) {
                filterEl.remove(1);
            }
            // Add intern options
            interns.forEach(intern => {
                const option = document.createElement('option');
                option.value = intern.id;
                option.textContent = intern.name;
                filterEl.appendChild(option);
            });
            // Restore selected value if it exists
            if (internFilter) {
                filterEl.value = internFilter;
            }
            // Refresh the custom dropdown to show new options
            refreshCustomDropdown(filterEl);
        }

        renderReports(reports);
    } catch (error) {
        showToast('Failed to load reports', 'error');
    }
}

/**
 * Renders the reports list.
 * @param {Array} reports - List of reports.
 */
function renderReports(reports) {
    const container = document.getElementById('reportsContainer');

    if (!reports.length) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                <h3>No reports yet</h3>
                <p>Create weekly reports to track intern progress</p>
                <button class="btn btn-primary" onclick="showReportModal()">Create Report</button>
            </div>
        `;
        return;
    }

    container.innerHTML = reports.map(report => {
        const intern = AppState.interns.find(i => i.id === report.intern_id);
        
        return `
            <div class="report-card">
                <div class="report-header">
                    <div class="report-header-info">
                        <div class="report-avatar" style="background: ${intern?.avatar_color || '#6366f1'}">
                            ${getInitials(report.intern_name)}
                        </div>
                        <div class="report-header-text">
                            <h4>${escapeHtml(report.intern_name)}</h4>
                            <span>${formatDate(report.week_start)} - ${formatDate(report.week_end)}</span>
                        </div>
                    </div>
                </div>
                <div class="report-body">
                    ${report.accomplishments ? `
                        <div class="report-section">
                            <h5>Accomplishments</h5>
                            <p>${escapeHtml(report.accomplishments)}</p>
                        </div>
                    ` : ''}
                    ${report.challenges ? `
                        <div class="report-section">
                            <h5>Challenges</h5>
                            <p>${escapeHtml(report.challenges)}</p>
                        </div>
                    ` : ''}
                    ${report.next_week_goals ? `
                        <div class="report-section">
                            <h5>Next Week Goals</h5>
                            <p>${escapeHtml(report.next_week_goals)}</p>
                        </div>
                    ` : ''}
                    ${report.supervisor_feedback ? `
                        <div class="report-section">
                            <h5>Supervisor Feedback</h5>
                            <p>${escapeHtml(report.supervisor_feedback)}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="report-footer">
                    <div>
                        <button class="btn btn-secondary btn-sm" onclick="showReportModal(${report.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteReport(${report.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Shows the report creation/edit modal.
 * @param {number|null} id - Report ID for editing, or null for new.
 */
async function showReportModal(id = null) {
    const isEdit = id !== null;
    let report = null;

    if (isEdit) {
        report = AppState.reports.find(r => r.id === id);
    }

    const interns = AppState.interns.length ? AppState.interns : await InternsAPI.getAll();

    // Calculate default week dates
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    elements.modalTitle.textContent = isEdit ? 'Edit Report' : 'Create Weekly Report';
    elements.modalBody.innerHTML = `
        <form id="reportForm">
            <div class="form-group">
                <label>Minion *</label>
                <select name="intern_id" required ${isEdit ? 'disabled' : ''}>
                    <option value="">Select intern</option>
                    ${interns.map(i => `
                        <option value="${i.id}" ${report?.intern_id === i.id ? 'selected' : ''}>${escapeHtml(i.name)}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Week Start *</label>
                    <input type="date" name="week_start" required value="${report?.week_start || weekStart.toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Week End *</label>
                    <input type="date" name="week_end" required value="${report?.week_end || weekEnd.toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="form-group">
                <label>Accomplishments</label>
                <textarea name="accomplishments" placeholder="What was accomplished this week?">${report?.accomplishments || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Challenges</label>
                <textarea name="challenges" placeholder="Any challenges faced?">${report?.challenges || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Next Week Goals</label>
                <textarea name="next_week_goals" placeholder="Goals for the upcoming week">${report?.next_week_goals || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Supervisor Feedback</label>
                <textarea name="supervisor_feedback" placeholder="Your feedback for the intern">${report?.supervisor_feedback || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Report</button>
            </div>
        </form>
    `;

    document.getElementById('reportForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const data = {
            intern_id: parseInt(formData.get('intern_id')),
            week_start: formData.get('week_start'),
            week_end: formData.get('week_end'),
            accomplishments: formData.get('accomplishments') || null,
            challenges: formData.get('challenges') || null,
            next_week_goals: formData.get('next_week_goals') || null,
            supervisor_feedback: formData.get('supervisor_feedback') || null
        };

        try {
            if (isEdit) {
                await ReportsAPI.update(id, data);
                showToast('Report updated successfully');
            } else {
                await ReportsAPI.create(data);
                showToast('Report created successfully');
            }
            closeModal();
            refreshView(AppState.currentView);
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    openModal();
}

/**
 * Deletes a report.
 * @param {number} id - Report ID.
 */
async function deleteReport(id) {
    const confirmed = await showConfirmModal({
        title: 'Delete Report',
        message: 'Are you sure you want to delete this report?',
        confirmText: 'Delete',
        type: 'danger'
    });
    
    if (!confirmed) return;

    try {
        await ReportsAPI.delete(id);
        showToast('Report deleted successfully');
        refreshView(AppState.currentView);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// Modal & Panel Functions
// ============================================

/**
 * Opens the modal and initializes any date/time pickers and custom dropdowns.
 */
function openModal() {
    elements.modalOverlay.classList.add('active');
    // Initialize Flatpickr on any date/time inputs in the modal
    // Initialize custom dropdowns
    setTimeout(() => {
        initDateTimePickers();
        initCustomDropdowns();
    }, 50);
}

/**
 * Closes the modal.
 */
function closeModal() {
    elements.modalOverlay.classList.remove('active');
    elements.modal.classList.remove('large');
}

/**
 * Opens the detail panel.
 */
function openDetailPanel() {
    elements.detailPanelOverlay.classList.add('active');
}

/**
 * Closes the detail panel.
 */
function closeDetailPanel() {
    elements.detailPanelOverlay.classList.remove('active');
}

// ============================================
// Event Listeners
// ============================================

// Navigation
elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(link.dataset.view);
    });
});

// Card actions (view all links)
elements.cardActions.forEach(action => {
    action.addEventListener('click', (e) => {
        e.preventDefault();
        if (action.dataset.view) {
            switchView(action.dataset.view);
        }
    });
});

// Add new button
elements.addNewBtn.addEventListener('click', () => {
    switch (AppState.currentView) {
        case 'dashboard':
        case 'interns':
            showInternModal();
            break;
        case 'projects':
            showProjectModal();
            break;
        case 'tasks':
            showTaskModal();
            break;
        case 'schedule':
            showEventModal();
            break;
        case 'reports':
            showReportModal();
            break;
    }
});

// Mobile menu toggle
elements.menuToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('open');
});

// Modal close
elements.modalClose.addEventListener('click', closeModal);
elements.modalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.modalOverlay) closeModal();
});

// Detail panel close
elements.detailPanelClose.addEventListener('click', closeDetailPanel);
elements.detailPanelOverlay.addEventListener('click', (e) => {
    if (e.target === elements.detailPanelOverlay) closeDetailPanel();
});

// Calendar navigation
document.getElementById('prevMonth').addEventListener('click', () => {
    AppState.calendarDate.setMonth(AppState.calendarDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    AppState.calendarDate.setMonth(AppState.calendarDate.getMonth() + 1);
    renderCalendar();
});

// Filter change handlers
document.getElementById('internStatusFilter')?.addEventListener('change', loadInterns);
document.getElementById('internDeptFilter')?.addEventListener('change', loadInterns);
document.getElementById('projectStatusFilter')?.addEventListener('change', loadProjects);
document.getElementById('projectPriorityFilter')?.addEventListener('change', loadProjects);
document.getElementById('taskStatusFilter')?.addEventListener('change', applyTaskFilters);
document.getElementById('taskInternFilter')?.addEventListener('change', applyTaskFilters);
document.getElementById('taskProjectFilter')?.addEventListener('change', applyTaskFilters);

/**
 * Applies all task filters (status, intern, project) and renders the filtered tasks.
 */
function applyTaskFilters() {
    const status = document.getElementById('taskStatusFilter')?.value || '';
    const internId = document.getElementById('taskInternFilter')?.value || '';
    const projectId = document.getElementById('taskProjectFilter')?.value || '';

    let filteredTasks = AppState.tasks;

    if (status) {
        filteredTasks = filteredTasks.filter(t => t.status === status);
    }
    if (internId) {
        filteredTasks = filteredTasks.filter(t => t.intern_id === parseInt(internId));
    }
    if (projectId) {
        filteredTasks = filteredTasks.filter(t => t.project_id === parseInt(projectId));
    }

    renderTasks(filteredTasks);
}
document.getElementById('reportInternFilter')?.addEventListener('change', loadReports);

// View toggle (grid/list)
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const container = document.getElementById('internsContainer');
        if (btn.dataset.viewType === 'grid') {
            container.classList.remove('list');
            container.classList.add('grid');
        } else {
            container.classList.remove('grid');
            container.classList.add('list');
        }
    });
});

// Global search
elements.globalSearch?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    // Implement search based on current view
    console.log('Search:', query);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeDetailPanel();
    }
});

// ============================================
// Expose functions globally
// ============================================

window.showInternModal = showInternModal;
window.showInternDetail = showInternDetail;
window.deleteIntern = deleteIntern;
window.showProjectModal = showProjectModal;
window.showProjectDetail = showProjectDetail;
window.deleteProject = deleteProject;
window.showTaskModal = showTaskModal;
window.deleteTask = deleteTask;
window.showEventModal = showEventModal;
window.deleteEvent = deleteEvent;
window.showReportModal = showReportModal;
window.deleteReport = deleteReport;
window.selectDate = selectDate;
window.closeModal = closeModal;
window.closeDetailPanel = closeDetailPanel;

// Trait adjustment functions
window.adjustInternTrait = adjustInternTrait;
window.startTraitEdit = startTraitEdit;

// Intern files and notes
window.handleFileUpload = handleFileUpload;
window.deleteInternFile = deleteInternFile;
window.toggleFileNotes = toggleFileNotes;
window.saveFileNotes = saveFileNotes;
window.showAddNoteForm = showAddNoteForm;
window.hideAddNoteForm = hideAddNoteForm;
window.saveInternNote = saveInternNote;
window.editInternNote = editInternNote;
window.updateInternNote = updateInternNote;
window.deleteInternNote = deleteInternNote;

// Sync functions
window.handleSyncClick = handleSyncClick;
window.showSyncModal = showSyncModal;
window.closeSyncModal = closeSyncModal;
window.connectGoogle = connectGoogle;
window.disconnectGoogle = disconnectGoogle;
window.exportToGoogleDrive = exportToGoogleDrive;
window.showImportOptions = showImportOptions;
window.closeImportOptions = closeImportOptions;
window.importFromGoogleDrive = importFromGoogleDrive;

// ============================================
// Google Drive Sync Functions
// ============================================

/**
 * Handles sync button click - auto-syncs if connected, shows modal if not.
 */
async function handleSyncClick() {
    try {
        setSyncingState(true);
        const status = await SyncAPI.getStatus();
        
        if (status.connected) {
            // Already connected - just sync (export) directly
            await performQuickSync();
        } else {
            // Not connected - show modal for setup
            showSyncModal();
        }
    } catch (error) {
        console.error('Sync click error:', error);
        showSyncModal();
    } finally {
        setSyncingState(false);
    }
}

/**
 * Performs a bidirectional sync: pulls changes from backup first, then pushes local changes.
 * This ensures any changes from other devices are merged before uploading.
 */
async function performQuickSync() {
    try {
        setSyncingState(true);
        showToast('Syncing with Google Drive...', 'info');
        
        const result = await SyncAPI.bidirectionalSync();
        
        if (result.backupExisted) {
            showToast('Synced: pulled remote changes and pushed local data', 'success');
        } else {
            showToast('Synced: created new backup', 'success');
        }
        updateSyncStatusDot(true);
        
        // If data was pulled from backup, we may need to refresh the UI
        if (result.pulled && result.pullResult && Object.keys(result.pullResult.imported).length > 0) {
            // Check if any data was actually imported
            const importedCount = Object.values(result.pullResult.imported).reduce((a, b) => a + b, 0);
            if (importedCount > 0) {
                showToast('New data received, refreshing...', 'info');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        }
    } catch (error) {
        console.error('Quick sync failed:', error);
        
        if (error.message && (error.message.includes('expired') || error.message.includes('401'))) {
            showToast('Session expired. Please reconnect.', 'error');
            showSyncModal();
        } else {
            showToast(error.message || 'Sync failed', 'error');
        }
    } finally {
        setSyncingState(false);
    }
}

/**
 * Shows the sync modal and loads current sync status.
 */
async function showSyncModal() {
    const overlay = document.getElementById('syncModalOverlay');
    overlay.classList.add('active');
    await loadSyncStatus();
}

/**
 * Closes the sync modal.
 */
function closeSyncModal() {
    const overlay = document.getElementById('syncModalOverlay');
    overlay.classList.remove('active');
}

/**
 * Loads and displays the current sync status.
 */
async function loadSyncStatus() {
    showSyncState('loading', 'Checking connection...');
    
    try {
        const status = await SyncAPI.getStatus();
        
        if (!status.configured) {
            showSyncState('notConfigured');
        } else if (!status.connected) {
            showSyncState('notConnected');
        } else {
            showSyncState('connected');
            updateConnectedUI(status);
        }
        
        // Update sidebar sync status dot
        updateSyncStatusDot(status.connected);
    } catch (error) {
        console.error('Failed to load sync status:', error);
        showSyncState('notConnected');
        showToast('Failed to check sync status', 'error');
    }
}

/**
 * Shows a specific sync state in the modal.
 * @param {string} state - The state to show (loading, notConfigured, notConnected, connected).
 * @param {string} loadingText - Optional text to show for loading state.
 */
function showSyncState(state, loadingText = 'Loading...') {
    const states = ['NotConfigured', 'NotConnected', 'Connected', 'Loading'];
    
    states.forEach(s => {
        const el = document.getElementById(`syncState${s}`);
        if (el) el.style.display = 'none';
    });
    
    if (state === 'loading') {
        const loadingEl = document.getElementById('syncStateLoading');
        const loadingTextEl = document.getElementById('syncLoadingText');
        if (loadingEl) loadingEl.style.display = 'flex';
        if (loadingTextEl) loadingTextEl.textContent = loadingText;
    } else if (state === 'notConfigured') {
        const el = document.getElementById('syncStateNotConfigured');
        if (el) el.style.display = 'flex';
    } else if (state === 'notConnected') {
        const el = document.getElementById('syncStateNotConnected');
        if (el) el.style.display = 'flex';
    } else if (state === 'connected') {
        const el = document.getElementById('syncStateConnected');
        if (el) el.style.display = 'flex';
    }
}

/**
 * Updates the connected state UI with user info.
 * @param {Object} status - The sync status object.
 */
function updateConnectedUI(status) {
    const userInfoEl = document.getElementById('syncUserInfo');
    const avatarEl = document.getElementById('syncUserAvatar');
    const nameEl = document.getElementById('syncUserName');
    const emailEl = document.getElementById('syncUserEmail');
    
    if (status.user) {
        if (userInfoEl) userInfoEl.style.display = 'flex';
        if (avatarEl) {
            avatarEl.src = status.user.picture || '';
            avatarEl.style.display = status.user.picture ? 'block' : 'none';
        }
        if (nameEl) nameEl.textContent = status.user.name || 'Connected';
        if (emailEl) emailEl.textContent = status.user.email || '';
    } else {
        // No user info available, show minimal connected state
        if (userInfoEl) userInfoEl.style.display = 'flex';
        if (avatarEl) avatarEl.style.display = 'none';
        if (nameEl) nameEl.textContent = 'Connected to Google Drive';
        if (emailEl) emailEl.textContent = 'User info not available';
    }
    
    const lastBackupEl = document.getElementById('syncLastBackupText');
    if (lastBackupEl) {
        if (status.lastBackup) {
            const date = new Date(status.lastBackup.modifiedTime);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const size = formatFileSize(parseInt(status.lastBackup.size) || 0);
            lastBackupEl.textContent = `Last backup: ${formattedDate} (${size})`;
        } else {
            lastBackupEl.textContent = 'No backup found';
        }
    }
}

/**
 * Formats a file size in bytes to a human-readable string.
 * @param {number} bytes - The file size in bytes.
 * @returns {string} Formatted file size.
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Updates the sync status dot in the sidebar.
 * @param {boolean} connected - Whether connected to Google.
 */
function updateSyncStatusDot(connected) {
    const dot = document.getElementById('syncStatusDot');
    if (dot) {
        dot.classList.toggle('connected', connected);
        dot.title = connected ? 'Connected to Google Drive' : 'Not connected';
    }
}

/**
 * Sets the sync status dot to syncing state.
 * @param {boolean} syncing - Whether currently syncing.
 */
function setSyncingState(syncing) {
    const dot = document.getElementById('syncStatusDot');
    if (dot) {
        dot.classList.toggle('syncing', syncing);
    }
}

/**
 * Initiates Google OAuth flow.
 */
async function connectGoogle() {
    try {
        const result = await SyncAPI.startAuth();
        if (result.authUrl) {
            // Open Google auth in the same window
            window.location.href = result.authUrl;
        }
    } catch (error) {
        console.error('Failed to start auth:', error);
        showToast(error.message || 'Failed to connect to Google', 'error');
    }
}

/**
 * Disconnects from Google Drive.
 */
async function disconnectGoogle() {
    try {
        await SyncAPI.logout();
        showToast('Disconnected from Google Drive', 'success');
        await loadSyncStatus();
    } catch (error) {
        console.error('Failed to disconnect:', error);
        showToast(error.message || 'Failed to disconnect', 'error');
    }
}

/**
 * Exports all data to Google Drive.
 */
async function exportToGoogleDrive() {
    const exportBtn = document.getElementById('syncExportBtn');
    const originalText = exportBtn.innerHTML;
    
    try {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<span class="sync-spinner" style="width:16px;height:16px;border-width:2px;"></span> Exporting...';
        setSyncingState(true);
        
        const result = await SyncAPI.exportData();
        
        showToast('Data exported to Google Drive successfully!', 'success');
        await loadSyncStatus();
    } catch (error) {
        console.error('Export failed:', error);
        showToast(error.message || 'Export failed', 'error');
        
        if (error.message && error.message.includes('expired')) {
            await loadSyncStatus();
        }
    } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalText;
        setSyncingState(false);
    }
}

/**
 * Shows import options modal with backup preview.
 */
async function showImportOptions() {
    const overlay = document.getElementById('importOptionsOverlay');
    const previewEl = document.getElementById('importPreview');
    
    previewEl.innerHTML = '<p style="text-align:center;">Loading preview...</p>';
    overlay.classList.add('active');
    
    try {
        const preview = await SyncAPI.previewImport();
        
        let html = `<p style="margin-bottom:var(--space-2);">Backup from: ${new Date(preview.exportedAt).toLocaleString()}</p>`;
        html += '<div class="import-preview-items">';
        
        for (const [table, count] of Object.entries(preview.tables || {})) {
            if (count > 0) {
                const displayName = table.replace(/_/g, ' ');
                html += `<div class="import-preview-item"><span>${displayName}</span><span>${count} records</span></div>`;
            }
        }
        
        html += '</div>';
        previewEl.innerHTML = html;
    } catch (error) {
        console.error('Failed to preview import:', error);
        
        if (error.message && error.message.includes('No backup found')) {
            previewEl.innerHTML = '<p style="text-align:center;color:var(--warning);">No backup found in Google Drive. Please export first.</p>';
        } else {
            previewEl.innerHTML = `<p style="text-align:center;color:var(--danger);">Failed to load preview: ${error.message}</p>`;
        }
    }
}

/**
 * Closes the import options modal.
 */
function closeImportOptions() {
    const overlay = document.getElementById('importOptionsOverlay');
    overlay.classList.remove('active');
}

/**
 * Imports data from Google Drive.
 */
async function importFromGoogleDrive() {
    const mergeRadio = document.querySelector('input[name="importMode"][value="merge"]');
    const merge = mergeRadio ? mergeRadio.checked : false;
    
    closeImportOptions();
    showSyncState('loading', merge ? 'Merging data...' : 'Importing data...');
    setSyncingState(true);
    
    try {
        const result = await SyncAPI.importData({ merge });
        
        if (result.success) {
            showToast('Data imported successfully! Refreshing...', 'success');
            
            // Refresh the application data
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast('Import completed with some errors', 'warning');
            console.warn('Import errors:', result.errors);
            await loadSyncStatus();
        }
    } catch (error) {
        console.error('Import failed:', error);
        showToast(error.message || 'Import failed', 'error');
        await loadSyncStatus();
    } finally {
        setSyncingState(false);
    }
}

/**
 * Checks URL parameters for sync callbacks.
 */
function checkSyncCallbackParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('sync_success')) {
        showToast('Connected to Google Drive! Click Sync to backup.', 'success');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Update sync status dot
        updateSyncStatusDot(true);
    }
    
    if (urlParams.has('sync_error')) {
        const error = urlParams.get('sync_error');
        showToast(`Google connection failed: ${error}`, 'error');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Initializes sync status on page load.
 */
async function initSyncStatus() {
    try {
        const status = await SyncAPI.getStatus();
        updateSyncStatusDot(status.connected);
    } catch (error) {
        // Silently fail - sync status is not critical
        console.warn('Could not check sync status:', error);
    }
    
    // Add right-click handler for sync button to open full modal
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showSyncModal();
        });
    }
}

// ============================================
// Initialize Application
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadTraits(); // Load trait definitions on startup
    loadDashboard();
    // Initialize custom dropdowns for filter selects
    initCustomDropdowns();
    
    // Check for sync callback params (after OAuth redirect)
    checkSyncCallbackParams();
    
    // Initialize sync status indicator
    initSyncStatus();
    
    // Close sync modal when clicking outside
    const syncModalOverlay = document.getElementById('syncModalOverlay');
    if (syncModalOverlay) {
        syncModalOverlay.addEventListener('click', (e) => {
            if (e.target === syncModalOverlay) {
                closeSyncModal();
            }
        });
    }
    
    // Close import options when clicking outside
    const importOptionsOverlay = document.getElementById('importOptionsOverlay');
    if (importOptionsOverlay) {
        importOptionsOverlay.addEventListener('click', (e) => {
            if (e.target === importOptionsOverlay) {
                closeImportOptions();
            }
        });
    }
    
    // Close weekly events popup when clicking outside
    const eventsPopupOverlay = document.getElementById('eventsPopupOverlay');
    if (eventsPopupOverlay) {
        eventsPopupOverlay.addEventListener('click', (e) => {
            if (e.target === eventsPopupOverlay) {
                closeWeeklyEventsPopup();
            }
        });
    }
    
    // Close stat popups when clicking outside
    ['internsPopupOverlay', 'projectsPopupOverlay', 'tasksPopupOverlay'].forEach(overlayId => {
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeStatPopup(overlayId);
                }
            });
        }
    });
});

