import { cookies } from 'next/headers';
import { sessionOperations } from './db';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'agent';
}

export interface Session {
  id: string;
  userId: string;
  user: User;
  expiresAt: number;
}

const SESSION_COOKIE_NAME = 'session_id';

export const auth = {
  // Create a new session and set cookie
  async createSession(userId: string): Promise<string> {
    const session = sessionOperations.create(userId);
    
    (await cookies()).set(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return session.id;
  },

  // Get current session from cookie
  async getSession(): Promise<Session | null> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return null;
    }

    const session = sessionOperations.findById(sessionId);

    if (!session) {
      // Session not found or expired, clear cookie
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      user: {
        id: session.userId,
        username: session.username,
        role: session.role,
      },
      expiresAt: session.expiresAt,
    };
  },

  // Destroy current session
  async destroySession(): Promise<void> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      sessionOperations.delete(sessionId);
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  },

  // Check if user has required role
  async hasRole(requiredRole: 'admin' | 'agent'): Promise<boolean> {
    const session = await this.getSession();
    return session?.user.role === requiredRole;
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession();
    return session?.user || null;
  },
};

// Clean up expired sessions periodically
setInterval(() => {
  sessionOperations.deleteExpired();
}, 60 * 60 * 1000); // Every hour
