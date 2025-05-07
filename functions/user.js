import { authenticateJWT } from "./auth.js";
import { closeDatabase } from "./database.js";
import cors from "./utils/cors.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = cors();

  // Handle preflight requests (OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Check if the user is authenticated (with the Authorization header from event)
    const authResult = await authenticateJWT(event);

    if (!authResult.authenticated) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authResult.error }),
      };
    }

    // Return the authenticated user information
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(authResult.user),
    };
  } catch (error) {
    console.error("Get user error:", error);

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
