import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { databaseConfig } from './database-config';
import { createClient } from '@libsql/client';
import { Agent, Device } from '@/app/admin/dashboard';

// Database file path
const client = createClient({
  url: databaseConfig.url,
  authToken: databaseConfig.authToken,
});

// Helper to get first row
const first = (result: any) => result.rows[0] || null;

// Initialize tables
export const initializeDatabase = async () => {
  // Users table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','agent')),
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      company_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      issuer_person TEXT NOT NULL
    )
  `);

  // Sessions table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      expiresAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Devices table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      agentId TEXT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','active')) DEFAULT 'pending',
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (agentId) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  // Meta table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Indexes
  await client.execute('CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions (userId)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions (expiresAt)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_devices_agentId ON devices (agentId)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status)');

  // Seed admin user if not initialized
  const meta = await client.execute('SELECT value FROM meta WHERE key = ?', ['initialized']);
  if (!first(meta)) {
    const usersCount = await client.execute('SELECT COUNT(*) as count FROM users');
    if (usersCount.rows[0].count === 0) {
      const adminId = nanoid();
      const passwordHash = await bcrypt.hash('password123', 12);
      await client.execute(
        'INSERT INTO users (id, username, passwordHash, role, company_name, email, phone, issuer_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [adminId, 'admin', passwordHash, 'admin', 'admin', 'admin', 'admin', 'admin']
      );
      console.log('Admin user created: admin / password123');
    }
    await client.execute('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['initialized', 'true']);
  }
};

// ----------------- User Operations -----------------
export const userOperations = {
  findByUsername: async (username: string) => {
    const result = await client.execute('SELECT * FROM users WHERE username = ?', [username]);
    return first(result);
  },

  findById: async (userId: string) => {
    const result = await client.execute('SELECT * FROM users WHERE id = ?', [userId]);
    return first(result);
  },

  create: async (username: string, password: string, role: 'admin' | 'agent') => {
    const id = nanoid();
    const passwordHash = await bcrypt.hash(password, 12);
    await client.execute(
      'INSERT INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)',
      [id, username, passwordHash, role]
    );
    return id;
  },

  verifyPassword: async (hashedPassword: string, plainPassword: string) => {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  updatePassword: async (userId: string, newPassword: string) => {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await client.execute('UPDATE users SET passwordHash = ? WHERE id = ?', [passwordHash, userId]);
  },

  findAllAgents: async () => {
    const result = await client.execute(`
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
    `);
    return result.rows as unknown as Agent[];
  },

  deleteById: async (userId: string) => {
    await client.execute('DELETE FROM devices WHERE agentId = ?', [userId]);
    await client.execute('DELETE FROM sessions WHERE userId = ?', [userId]);
    await client.execute('DELETE FROM users WHERE id = ?', [userId]);
  },

  invalidateUserSessions: async (userId: string) => {
    await client.execute('DELETE FROM sessions WHERE userId = ?', [userId]);
  },
};

// ----------------- Session Operations -----------------
export const sessionOperations = {
  create: async (userId: string, expiresIn: number = 30 * 24 * 60 * 60 * 1000) => {
    const id = nanoid();
    const expiresAt = Date.now() + expiresIn;
    await client.execute('INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)', [id, userId, expiresAt]);
    return { id, expiresAt };
  },

  findById: async (sessionId: string) => {
    const result = await client.execute(`
      SELECT s.*, u.username, u.role
      FROM sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.id = ? AND s.expiresAt > ?
    `, [sessionId, Date.now()]);
    return first(result);
  },

  delete: async (sessionId: string) => {
    await client.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
  },

  deleteExpired: async () => {
    await client.execute('DELETE FROM sessions WHERE expiresAt <= ?', [Date.now()]);
  },

  deleteByUserId: async (userId: string) => {
    await client.execute('DELETE FROM sessions WHERE userId = ?', [userId]);
  },
};

// ----------------- Device Operations -----------------
export const deviceOperations = {
  create: async (agentId: string | null, agentNameOrUsername: string, providedPassword?: string, status: 'pending' | 'active' = 'pending') => {
    const id = nanoid();
    let deviceUsername: string;
    let devicePassword: string;

    if (agentId && !providedPassword) {
      const randomSuffix = nanoid(4);
      deviceUsername = `${agentNameOrUsername}_${randomSuffix}`;
      devicePassword = nanoid(6);
    } else {
      deviceUsername = agentNameOrUsername;
      devicePassword = providedPassword || nanoid(16);
    }

    await client.execute(
      'INSERT INTO devices (id, agentId, username, password, status) VALUES (?, ?, ?, ?, ?)',
      [id, agentId, deviceUsername, devicePassword, status]
    );

    return { id, username: deviceUsername, password: devicePassword };
  },

  findByAgentId: async (agentId: string) => {
    const result = await client.execute('SELECT * FROM devices WHERE agentId = ? ORDER BY createdAt DESC', [agentId]);
    return result.rows as unknown as Device[];
  },

  findPending: async () => {
    const result = await client.execute(`
      SELECT d.*, u.username as agentName
      FROM devices d
      LEFT JOIN users u ON d.agentId = u.id
      WHERE d.status = 'pending'
      ORDER BY d.createdAt DESC
    `);
    return result.rows as unknown as Device[];
  },

  findAll: async () => {
    const result = await client.execute(`
      SELECT d.*, u.username as agentName
      FROM devices d
      LEFT JOIN users u ON d.agentId = u.id
      ORDER BY d.createdAt DESC
    `);
    return result.rows as unknown as Device[];
  },

  approve: async (deviceId: string) => {
    await client.execute('UPDATE devices SET status = ? WHERE id = ?', ['active', deviceId]);
  },

  delete: async (deviceId: string) => {
    await client.execute('DELETE FROM devices WHERE id = ?', [deviceId]);
  },

  findById: async (deviceId: string) => {
    const result = await client.execute('SELECT * FROM devices WHERE id = ?', [deviceId]);
    return first(result);
  },

  transferOwnership: async (deviceId: string, newAgentId: string) => {
    await client.execute('UPDATE devices SET agentId = ? WHERE id = ?', [newAgentId, deviceId]);
  },

  removeOwnership: async (deviceId: string) => {
    await client.execute('UPDATE devices SET agentId = NULL WHERE id = ?', [deviceId]);
  },
};

// Automatically initialize database on import
initializeDatabase().catch(console.error);
export { client };
