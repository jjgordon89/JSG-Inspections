# JSG Inspections - Overhead Lifting Equipment Management System

## Overview

JSG Inspections is a comprehensive desktop application for managing and tracking overhead lifting equipment inspections, compliance, and maintenance. Built with React and Electron, it provides a secure, offline-capable solution for industrial equipment management.

## Features

- **Equipment Management**: Track and manage overhead lifting equipment inventory
- **Inspection Scheduling**: Automated scheduling and tracking of required inspections
- **Compliance Monitoring**: Ensure regulatory compliance with automated alerts
- **Document Management**: Secure storage and retrieval of inspection documents
- **Audit Logging**: Complete audit trail for all system activities
- **Certificate Generation**: Automated generation of compliance certificates
- **User Management**: Role-based access control (Admin, Inspector, Reviewer, Viewer)

## Technology Stack

- **Frontend**: React 19, Chart.js, React Router
- **Backend**: Electron, SQLite3
- **Security**: Parameterized queries, input validation, audit logging
- **Build Tools**: React Scripts, Electron Builder

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd JSG-Inspections
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Start the application:
   ```bash
   npm start
   ```

## Development

### Development Mode

To run the application in development mode with hot reload:

```bash
npm run dev
```

This will start both the React development server and Electron in development mode.

### Building for Production

```bash
npm run dist
```

## Database

The application uses SQLite3 for data storage with automatic migrations. The database includes:

- Equipment inventory
- Inspection records
- User management
- Audit logging
- Compliance tracking
- Document storage

## Security Features

- **SQL Injection Protection**: All database operations use parameterized queries
- **Input Validation**: Comprehensive validation on all user inputs
- **Audit Logging**: Complete audit trail with user context
- **Role-Based Access**: Four-tier permission system
- **Document Integrity**: Hash verification for critical documents

## User Roles

- **Admin**: Full system access, user management
- **Inspector**: Create and manage inspections
- **Reviewer**: Review and approve inspections
- **Viewer**: Read-only access to reports and data

## Support

For technical support or questions, please contact the development team.

## License

ISC License - See LICENSE file for details.