import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { initializeDatabase, getAsync, allAsync, runAsync, closeDatabase } from "./database.js";

// JWT secret key - in production, this should be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const JWT_EXPIRY = '24h';

/**
 * Helper function to verify user credentials
 */
export async function verifyCredentials(username, password) {
  await initializeDatabase();
  
  try {
    const user = await getAsync(
      "SELECT id, username, password, display_name as \"displayName\", is_admin as \"isAdmin\", created_at as \"createdAt\" FROM users WHERE username = $1",
      [username]
    );
    
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    // Don't include password in returned user object
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error("Error verifying credentials:", error);
    throw error;
  }
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user) {
  // Remove sensitive data from the token payload
  const { password, ...userForToken } = user;
  
  return jwt.sign(userForToken, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to get a user by ID
 */
export async function getUserById(id) {
  await initializeDatabase();
  
  try {
    const user = await getAsync(
      "SELECT id, username, display_name as \"displayName\", is_admin as \"isAdmin\", created_at as \"createdAt\" FROM users WHERE id = $1",
      [id]
    );
    return user;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
}

/**
 * Register a new user
 */
export async function registerUser(username, password, displayName) {
  await initializeDatabase();
  
  try {
    const existingUser = await getAsync(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    
    if (existingUser) {
      return { error: "Username already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await runAsync(
      "INSERT INTO users (username, password, display_name, is_admin) VALUES ($1, $2, $3, $4) RETURNING id",
      [username, hashedPassword, displayName || username, false]
    );

    // Get the newly created user
    const user = await getAsync(
      "SELECT id, username, display_name as \"displayName\", is_admin as \"isAdmin\", created_at as \"createdAt\" FROM users WHERE id = $1",
      [result.lastID]
    );

    return { user };
  } catch (error) {
    console.error("Error registering user:", error);
    return { error: "Internal server error" };
  }
}

/**
 * Setup Express authentication with Passport
 * (Modified for serverless - not used in serverless functions, but included for compatibility with attached file structure)
 */
export function setupAuth(app) {
  console.log("Auth setup: Using JWT for serverless functions. Passport setup skipped.");
  
  // These routes are handled by serverless functions
  // but included here for structure compatibility
  
  // Register route is handled by /functions/register.js
  // Login route is handled by /functions/login.js
  // Logout route is handled by /functions/logout.js
  // User route is handled by /functions/user.js
}
