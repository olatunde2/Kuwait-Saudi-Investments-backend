import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { initializeDatabase, getAsync, runAsync } from "./database.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const JWT_EXPIRY = "24h";

// 🔐 Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.display_name,
      isAdmin: user.isAdmin || user.is_admin,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// ✅ Middleware: Authenticate JWT
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ✅ Middleware: Check if user is admin
export function isAdmin(req, res, next) {
  if (req.user?.isAdmin || req.user?.is_admin) {
    return next();
  }
  return res.status(403).json({ error: "Admin access required" });
}

// 🔍 Verify user credentials
export async function verifyCredentials(username, password) {
  await initializeDatabase();

  try {
    const user = await getAsync(
      `SELECT id, username, password, display_name as "displayName", is_admin as "isAdmin", created_at as "createdAt" FROM users WHERE username = $1`,
      [username]
    );

    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error("Error verifying credentials:", error);
    throw error;
  }
}

// 👤 Get user by ID
export async function getUserById(id) {
  await initializeDatabase();

  try {
    const user = await getAsync(
      `SELECT id, username, display_name as "displayName", is_admin as "isAdmin", created_at as "createdAt" FROM users WHERE id = $1`,
      [id]
    );
    return user;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
}

// 📝 Register a new user
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
      `INSERT INTO users (username, password, display_name, is_admin) VALUES ($1, $2, $3, $4) RETURNING id`,
      [username, hashedPassword, displayName || username, false]
    );

    const user = await getAsync(
      `SELECT id, username, display_name as "displayName", is_admin as "isAdmin", created_at as "createdAt" FROM users WHERE id = $1`,
      [result.lastID]
    );

    return { user };
  } catch (error) {
    console.error("Error registering user:", error);
    return { error: "Internal server error" };
  }
}

// 🔒 Optional: Setup stub for passport compatibility
export function setupAuth(app) {
  console.log(
    "Auth setup: Using JWT for serverless functions. Passport setup skipped."
  );
}
