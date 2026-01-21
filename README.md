# Chop Chop! 🔪

*Get moving! No slacking allowed.*

A web application to track intern progress, schedules, and projects (NOT LIMITED TO INTERNS).

## Features

- Track interns information and progress
- Manage schedules and projects
- File upload support

## Screenshots

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Minions Management
![Interns](screenshots/interns.png)

### Schedule & Calendar
![Schedule](screenshots/schedule.png)

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sh-how/chop-chop.git
   cd chop-chop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
├── data/               # SQLite database
├── public/             # Frontend files
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript files
│   └── index.html     # Main HTML file
├── server/            # Backend server
│   └── index.js       # Express server
├── uploads/           # Uploaded files
└── package.json       # Project configuration
```

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Frontend**: HTML, CSS, JavaScript

## License

MIT


