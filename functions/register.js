import { registerUser, generateToken } from "./auth.js";
import { closeDatabase } from "./database.js";
import cors from "./utils/cors.js";

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
    const { username, password, displayName } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Username and password are required" }),
      };
    }

    const result = await registerUser(username, password, displayName);

    if (result.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: result.error }),
      };
    }

    // Generate JWT token
    const token = generateToken(result.user);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ user: result.user, token }),
    };
  } catch (error) {
    console.error("Registration error:", error);

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
