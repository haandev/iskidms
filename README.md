# UK BSDMS - British Standard Device Management System

A comprehensive device management system built with Next.js, TypeScript, and SQLite.

## Features

- **Authentication System**: Secure login with bcrypt password hashing
- **Role-based Access Control**: Admin and Agent roles with different permissions
- **Agent Self-registration**: Agents can register themselves
- **Device Management**: Agents can create devices, admins can approve/delete them
- **Session Management**: Secure sessions with httpOnly cookies
- **Real-time Updates**: Server Actions for immediate UI updates

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

1. Clone the repository or use the existing project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Admin Credentials

- **Username**: `admin`
- **Password**: `password123`

## User Flows

### Agent Flow
1. **Registration**: Visit `/register` to create an agent account
2. **Login**: Use credentials to sign in at `/login`
3. **Device Management**: Create devices from the agent dashboard
4. **View Devices**: See all your devices and their status

### Admin Flow
1. **Login**: Use admin credentials at `/login`
2. **Dashboard**: View pending devices requiring approval
3. **Device Approval**: Approve or delete pending devices
4. **View All Devices**: See all devices in the system with credentials

## Technical Details

### Database Schema

- **users**: id, username, passwordHash, role, createdAt
- **sessions**: id, userId, createdAt, expiresAt
- **devices**: id, agentId, username, password, status, createdAt
- **meta**: key, value (for initialization flag)

### Security Features

- Password hashing with bcrypt (12 rounds)
- Secure session management with expiration
- HttpOnly, Secure, SameSite cookies
- Role-based route protection
- CSRF protection via Server Actions

### Device Credentials

- **Device Username**: `{agentName}_{random4chars}`
- **Device Password**: 24-character random string
- **Storage**: Device passwords stored as plain text (as specified)

## Routes

- `/` - Home (redirects based on authentication)
- `/login` - Login page (shared by admin & agents)
- `/register` - Agent self-registration
- `/agent` - Agent dashboard (protected)
- `/admin` - Admin dashboard (protected)

## Development

The application uses:
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **shadcn/ui** for modern UI components
- **better-sqlite3** for database operations
- **Server Actions** for form handling
- **Zod** for form validation

## Database

The SQLite database is automatically created on first run with:
- Table creation and indexing
- Admin user seeding
- Session cleanup

## Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Configure proper domain for cookies
3. Use a production-grade database if needed
4. Set up proper SSL certificates

## Security Notes

- User passwords are hashed with bcrypt
- Device passwords are stored in plain text (as required)
- Sessions expire after 30 days
- All routes are protected by middleware
- Form submissions use Server Actions for CSRF protection# iskidms
