// Database configuration for Turso
export const dbConfig = {
  // Turso configuration
  turso: {
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  },
  // Fallback to local SQLite for development
  local: {
    url: 'file:./data/database.sqlite',
    authToken: undefined,
  }
};

// Determine which database to use
export const isDevelopment = process.env.NODE_ENV === 'development';
export const useTurso = !!(dbConfig.turso.url && dbConfig.turso.authToken);

export const databaseConfig = useTurso ? dbConfig.turso : dbConfig.local;
