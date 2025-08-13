# JSG Inspections

JSG Inspections is a comprehensive desktop application for managing and tracking overhead lifting equipment. It provides a complete solution for scheduling, performing, and documenting inspections, ensuring compliance with safety standards.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Development Setup](#development-setup)
- [Database](#database)
- [Migration System](#migration-system)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [Go-to-Market Strategy](#go-to-market-strategy)

## Features

### Core Functionality
- **Equipment Management**: Add, edit, and track overhead lifting equipment with detailed specifications
- **Inspection Scheduling**: Schedule and manage inspection workflows
- **Deficiency Tracking**: Capture deficiencies with priority levels, photos, and annotations
- **Document Management**: Attach and manage equipment-related documents
- **Compliance Reporting**: Generate PDF reports for compliance documentation
- **QR Code Integration**: Generate and scan QR codes for equipment identification

### Technical Features
- **Offline-First**: All data stored locally with SQLite database
- **Photo Annotation**: Mark up deficiency photos with annotations and markers
- **Template System**: Customizable inspection templates
- **Backup & Recovery**: Automatic database backups with migration rollback
- **Security**: Parameterized queries and file path validation

## Installation

### Prerequisites
- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/jjgordon89/JSG-Inspections.git
   cd JSG-Inspections
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. In a separate terminal, start the Electron app:
   ```bash
   npm run electron
   ```

### Production Build
```bash
npm run build
npm run electron-pack
```

## Development Setup

### Project Structure
```
JSG-Inspections/
├── public/                 # Static files and Electron main process
│   ├── electron.js        # Main Electron process
│   └── preload.js         # Preload script for IPC
├── src/                   # React application source
│   ├── components/        # React components
│   ├── store/            # State management (Zustand)
│   ├── database/         # Database utilities
│   └── utils/            # Utility functions
├── database.js           # Database initialization and schema
└── package.json          # Dependencies and scripts
```

### Available Scripts
- `npm start` - Start React development server
- `npm run build` - Build React app for production
- `npm run electron` - Start Electron app in development
- `npm run electron-pack` - Package Electron app for distribution
- `npm test` - Run test suite

### Development Workflow
1. Start React dev server: `npm start`
2. In another terminal, start Electron: `npm run electron`
3. The app will open with hot reload enabled
4. Make changes to React components and see them reflected immediately

## Database

### Database Location
The SQLite database is stored in the user's application data directory:
- **Windows**: `%APPDATA%/JSG-Inspections/database.db`
- **macOS**: `~/Library/Application Support/JSG-Inspections/database.db`
- **Linux**: `~/.config/JSG-Inspections/database.db`

### Database Schema
The application uses the following main tables:

#### Equipment
- `id` - Primary key
- `equipment_id` - Unique equipment identifier
- `type` - Equipment type (crane, hoist, etc.)
- `manufacturer` - Equipment manufacturer
- `model` - Equipment model
- `serial_number` - Serial number
- `capacity` - Load capacity
- `installation_date` - Installation date
- `location` - Equipment location
- `status` - Current status
- `qr_code_data` - QR code data

#### Inspections
- `id` - Primary key
- `equipment_id` - Foreign key to equipment
- `inspector` - Inspector name
- `inspection_date` - Date of inspection
- `findings` - Inspection findings (JSON)
- `corrective_actions` - Required actions
- `summary_comments` - Summary comments
- `signature` - Digital signature

#### Documents
- `id` - Primary key
- `equipment_id` - Foreign key to equipment
- `file_name` - Document filename
- `file_path` - Path to document file

### Backup Procedures

#### Automatic Backups
The application automatically creates database backups:
- Before each migration
- Stored in `userData/backups/` directory
- Named with timestamp: `database-backup-YYYY-MM-DDTHH-MM-SS-sssZ.db`
- Old backups automatically cleaned up (keeps last 10)

#### Manual Backup
To manually backup your database:
1. Close the JSG Inspections application
2. Navigate to the database location (see above)
3. Copy `database.db` to a safe location
4. Restart the application

#### Restore from Backup
To restore from a backup:
1. Close the JSG Inspections application
2. Navigate to the database location
3. Replace `database.db` with your backup file
4. Restart the application

## Migration System

### Overview
JSG Inspections uses an automatic migration system to handle database schema updates safely.

### How It Works
1. **Version Tracking**: Each database has a `schema_version` table tracking the current version
2. **Automatic Backup**: Before running migrations, the system creates a backup
3. **Sequential Execution**: Migrations run in order from current version to target version
4. **Rollback on Failure**: If a migration fails, the database is restored from backup
5. **Logging**: All migration activities are logged to `userData/migration.log`

### Migration Process
When the application starts:
1. Check current database schema version
2. Compare with required version (`CURRENT_SCHEMA_VERSION` in `database.js`)
3. If update needed:
   - Create automatic backup
   - Run migrations sequentially
   - Update schema version
   - Clean up old backups
4. If migration fails:
   - Log error details
   - Restore from backup
   - Display error to user

### Migration Files
- **Location**: `src/database/migrationManager.js`
- **Configuration**: `database.js` (migrations object)
- **Logs**: `userData/migration.log`
- **Backups**: `userData/backups/`

### Adding New Migrations
To add a new migration:
1. Increment `CURRENT_SCHEMA_VERSION` in `database.js`
2. Add migration function to `migrations` object:
   ```javascript
   const migrations = {
     1: (db, callback) => {
       // Migration 1 code
     },
     2: (db, callback) => {
       // New migration code
       db.run('ALTER TABLE...', callback);
     }
   };
   ```

## Troubleshooting

### Common Issues

#### Database Connection Errors
- **Symptom**: "Database connection error" on startup
- **Solution**: Check file permissions in userData directory
- **Recovery**: Delete database.db to recreate (will lose data)

#### Migration Failures
- **Symptom**: App won't start after update
- **Solution**: Check `migration.log` for error details
- **Recovery**: Restore from automatic backup in `userData/backups/`

#### Missing Dependencies
- **Symptom**: Module not found errors
- **Solution**: Run `npm install --legacy-peer-deps`

#### Electron Won't Start
- **Symptom**: Electron window doesn't open
- **Solution**: 
  1. Ensure React dev server is running (`npm start`)
  2. Check console for errors
  3. Try `npm run electron` in separate terminal

### Log Files
- **Migration Log**: `userData/migration.log`
- **Electron Console**: Check DevTools (Ctrl+Shift+I)
- **React Console**: Browser DevTools in Electron window

### Recovery Procedures

#### Complete Database Reset
If the database is corrupted:
1. Close JSG Inspections
2. Navigate to userData directory
3. Rename `database.db` to `database.db.backup`
4. Restart application (will create fresh database)

#### Restore from Backup
1. Close JSG Inspections
2. Navigate to `userData/backups/`
3. Find desired backup file
4. Copy to userData directory as `database.db`
5. Restart application

## Architecture

### Technology Stack
- **Frontend**: React 18 with functional components and hooks
- **State Management**: Zustand for lightweight state management
- **Database**: SQLite with sqlite3 Node.js driver
- **Desktop Framework**: Electron for cross-platform desktop app
- **Styling**: CSS with Tailwind CSS utility classes
- **Build Tool**: Create React App with custom Electron integration

### Security Features
- **SQL Injection Prevention**: All queries use parameterized statements
- **File Path Validation**: Prevents directory traversal attacks
- **IPC Security**: Secure communication between main and renderer processes
- **Local Data Storage**: All data stays on user's device

### Performance Optimizations
- **Database Indexing**: Optimized indexes for common queries
- **Lazy Loading**: Components load data as needed
- **Efficient State Management**: Minimal re-renders with Zustand
- **Image Optimization**: Compressed photo storage

## Go-to-Market Strategy

### Licensing Model

JSG Inspections will be offered under a tiered subscription model:

*   **Basic Plan ($49/month):** Includes core features for a single user, such as equipment and inspection management, standard reporting, and the template builder.
*   **Pro Plan ($99/month):** Designed for teams, this plan includes all Basic features plus multi-user support, advanced reporting and analytics, and compliance management.
*   **Enterprise Plan (Custom Pricing):** For large organizations, this plan offers all Pro features plus dedicated support, custom integrations, and on-premise deployment options.

### Distribution Plan

The application will be distributed through the following channels:

*   **Official Website:** A dedicated website will serve as the primary platform for marketing, sales, and support.
*   **Platform-Specific App Stores:** The application will be submitted to the Mac App Store and Microsoft Store for broader reach.
*   **Industry Partnerships:** We will collaborate with industry associations and equipment manufacturers to promote the application.

### Marketing Materials

Our marketing strategy will focus on highlighting the benefits of a secure, on-device solution. Key materials will include:

*   **Website:** A professional website with a product tour, feature comparison, and pricing details.
*   **Product Demo:** A comprehensive video showcasing the application's features and ease of use.
*   **Brochures and Case Studies:** Professionally designed materials for sales and marketing efforts.
*   **Social Media Campaign:** A targeted campaign on LinkedIn and other relevant platforms to reach our target audience.

## Support

For technical support or questions:
- Check this README for common solutions
- Review log files for error details
- Create an issue on the GitHub repository
- Contact support team for enterprise customers

## License

Copyright (c) 2025 JSG Inspections. All rights reserved.
