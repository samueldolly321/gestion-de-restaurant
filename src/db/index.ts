import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.ts';

// Function to create a new connection pool.
// En production (Render, etc.), on utilise DATABASE_URL (chaîne de connexion) avec SSL.
// En local, on retombe sur les variables SQL_* du .env.
export const createPool = () => {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return new Pool({
      connectionString,
      // Render/Postgres géré : SSL requis. rejectUnauthorized:false accepte le certificat du fournisseur.
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
  }

  const host = process.env.SQL_HOST;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  const database = process.env.SQL_DB_NAME;
  // Port optionnel : l'app desktop (Postgres embarqué) écoute sur un port dédié (ex. 54329).
  const port = process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined;

  if (!host || !user || !password || !database) {
    console.warn("Database credentials missing in environment variables. Connection may fail.");
  }

  return new Pool({
    host,
    port,
    user,
    password,
    database,
    connectionTimeoutMillis: 15000,
  });
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
