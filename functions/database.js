import pg from "pg";
import bcrypt from "bcrypt";

// Use DATABASE_URL environment variable for PostgreSQL connection
const { Pool } = pg;

// Global connection pool for reuse across function invocations
let pool;

/**
 * Create a connection pool to PostgreSQL
 * @param {number} retries
 * @param {number} delay
 * @returns {Promise<pg.Pool>}
 */
function createConnectionPool(retries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    const tryConnect = async (attemptsLeft) => {
      try {
        const newPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false, // Required for Neon PostgreSQL
          },
        });

        // Test the connection
        const client = await newPool.connect();
        client.release();

        console.log("Connected to PostgreSQL database");
        resolve(newPool);
      } catch (err) {
        console.error(
          `Database connection failed (${attemptsLeft} retries left):`,
          err
        );
        if (attemptsLeft > 0) {
          setTimeout(() => tryConnect(attemptsLeft - 1), delay);
        } else {
          reject(err);
        }
      }
    };

    tryConnect(retries);
  });
}

/**
 * Execute a query with the connection pool
 * @param {string} text
 * @param {Array} params
 * @returns {Promise<any>}
 */
async function query(text, params = []) {
  if (!pool) {
    pool = await createConnectionPool();
  }

  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error("Error executing query", err.stack);
    throw err;
  }
}

/**
 * Promisified methods for PostgreSQL similar to SQLite's Async methods
 */
// Get a single row
async function getAsync(text, params = []) {
  const result = await query(text, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Get all rows
async function allAsync(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

// Run a query with no return value (INSERT, UPDATE, DELETE)
async function runAsync(text, params = []) {
  const result = await query(text, params);
  return {
    changes: result.rowCount,
    lastID:
      params.length > 0
        ? result.rows && result.rows[0]
          ? result.rows[0].id
          : null
        : null,
  };
}

export async function initializeDatabase() {
  if (pool) return { query, getAsync, allAsync, runAsync };

  // Create connection pool
  pool = await createConnectionPool();

  // No need to create tables or insert data,
  // as we're using the existing PostgreSQL database

  // Return query interface
  return { query, getAsync, allAsync, runAsync };
}

// Helper function to close the connection pool after function execution
export function closeDatabase() {
  if (pool) {
    pool
      .end()
      .then(() => console.log("Database connection pool closed"))
      .catch((err) => console.error("Error closing pool", err));
    pool = null;
  }
}

// Exporting both the raw query function and the promisified methods
export { query, getAsync, allAsync, runAsync };

// For backward compatibility
export const db = { query, getAsync, allAsync, runAsync };
