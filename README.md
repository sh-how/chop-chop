# Intern Manager

A web application to track intern progress, schedules, and projects.

## Features

- Track intern information and progress
- Manage schedules and projects
- File upload support

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/intern-manager.git
   cd intern-manager
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

