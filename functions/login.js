import { verifyCredentials, generateToken } from "./auth.js";
import { closeDatabase } from "./database.js";
import { cors } from "./utils/cors.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = cors();

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Username and password are required" }),
      };
    }

    const user = await verifyCredentials(username, password);

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid credentials" }),
      };
    }

    // Generate JWT token
    const token = generateToken(user);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ user, token }),
    };
  } catch (error) {
    console.error("Login error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
