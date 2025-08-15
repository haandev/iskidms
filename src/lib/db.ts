import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import path from 'path';

// Database file path
const DB_PATH = path.join(process.cwd(), 'database.sqlite');

// Initialize database connection
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
const createTables = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'agent')),
      createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      expiresAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Devices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      agentId TEXT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'active')) DEFAULT 'pending',
      createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (agentId) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  // Meta table for initialization flag
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions (userId);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions (expiresAt);
    CREATE INDEX IF NOT EXISTS idx_devices_agentId ON devices (agentId);
    CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status);
  `);
};

// Initialize database
const initializeDatabase = async () => {
  createTables();

  // Check if database has been initialized
  const isInitialized = db.prepare('SELECT value FROM meta WHERE key = ?').get('initialized');

  if (!isInitialized) {
    // Seed admin user if users table is empty
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    if (userCount.count === 0) {
      const adminId = nanoid();
      const passwordHash = await bcrypt.hash('password123', 12);

      db.prepare(`
        INSERT INTO users (id, username, passwordHash, role)
        VALUES (?, ?, ?, ?)
      `).run(adminId, 'admin', passwordHash, 'admin');

      console.log('Admin user created: admin / password123');
    }

    // Mark as initialized
    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('initialized', 'true');
  }
};

// User operations
export const userOperations = {
  findByUsername: (username: string) => {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  },

  create: async (username: string, password: string, role: 'admin' | 'agent') => {
    const id = nanoid();
    const passwordHash = await bcrypt.hash(password, 12);

    db.prepare(`
      INSERT INTO users (id, username, passwordHash, role)
      VALUES (?, ?, ?, ?)
    `).run(id, username, passwordHash, role);

    return id;
  },

  verifyPassword: async (hashedPassword: string, plainPassword: string) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  updatePassword: async (userId: string, newPassword: string) => {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    db.prepare(`
      UPDATE users SET passwordHash = ? WHERE id = ?
    `).run(passwordHash, userId);
  },

  findAllAgents: () => {
    return db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        u.createdAt,
        COUNT(d.id) as deviceCount
      FROM users u
      LEFT JOIN devices d ON u.id = d.agentId
      WHERE u.role = 'agent' 
      GROUP BY u.id, u.username, u.role, u.createdAt
      ORDER BY u.createdAt DESC
    `).all() as any[];
  },

  findById: (userId: string) => {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  },

  deleteById: (userId: string) => {
    // Delete user's devices first (due to foreign key constraint)
    db.prepare('DELETE FROM devices WHERE agentId = ?').run(userId);
    // Delete user's sessions
    db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
    // Finally delete the user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  },

  invalidateUserSessions: (userId: string) => {
    db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
  },
};

// Session operations
export const sessionOperations = {
  create: (userId: string, expiresIn: number = 30 * 24 * 60 * 60 * 1000) => { // 30 days default
    const id = nanoid();
    const expiresAt = Date.now() + expiresIn;

    db.prepare(`
      INSERT INTO sessions (id, userId, expiresAt)
      VALUES (?, ?, ?)
    `).run(id, userId, expiresAt);

    return { id, expiresAt };
  },

  findById: (sessionId: string) => {
    return db.prepare(`
      SELECT s.*, u.username, u.role
      FROM sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.id = ? AND s.expiresAt > ?
    `).get(sessionId, Date.now()) as any;
  },

  delete: (sessionId: string) => {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  },

  deleteExpired: () => {
    db.prepare('DELETE FROM sessions WHERE expiresAt <= ?').run(Date.now());
  },

  deleteByUserId: (userId: string) => {
    db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
  },
};

// Device operations
export const deviceOperations = {
  create: (agentId: string, agentName: string) => {
    const id = nanoid();
    const randomSuffix = nanoid(4);
    const deviceUsername = `${agentName}_${randomSuffix}`;
    const devicePassword = nanoid(6); // 6 character random password

    db.prepare(`
      INSERT INTO devices (id, agentId, username, password, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(id, agentId, deviceUsername, devicePassword);

    return {
      id,
      username: deviceUsername,
      password: devicePassword,
    };
  },

  findByAgentId: (agentId: string) => {
    return db.prepare('SELECT * FROM devices WHERE agentId = ? ORDER BY createdAt DESC').all(agentId) as any[];
  },

  findPending: () => {
    return db.prepare(`
      SELECT d.*, u.username as agentName
      FROM devices d
      LEFT JOIN users u ON d.agentId = u.id
      WHERE d.status = 'pending'
      ORDER BY d.createdAt DESC
    `).all() as any[];
  },

  findAll: () => {
    return db.prepare(`
      SELECT d.*, u.username as agentName
      FROM devices d
      LEFT JOIN users u ON d.agentId = u.id
      ORDER BY d.createdAt DESC
    `).all() as any[];
  },

  approve: (deviceId: string) => {
    db.prepare('UPDATE devices SET status = ? WHERE id = ?').run('active', deviceId);
  },

  delete: (deviceId: string) => {
    db.prepare('DELETE FROM devices WHERE id = ?').run(deviceId);
  },

  findById: (deviceId: string) => {
    return db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) as any;
  },

  transferOwnership: (deviceId: string, newAgentId: string) => {
    db.prepare(`
      UPDATE devices SET agentId = ? WHERE id = ?
    `).run(newAgentId, deviceId);
  },

  removeOwnership: (deviceId: string) => {
    db.prepare(`
      UPDATE devices SET agentId = NULL WHERE id = ?
    `).run(deviceId);
  },
};

// Initialize database on module load
initializeDatabase().catch(console.error);

export { db };
