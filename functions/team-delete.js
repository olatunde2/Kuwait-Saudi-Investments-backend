import { isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, closeDatabase } from "./database.js";
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

  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Check admin authentication
    const authResult = isAdmin(event);

    if (!authResult.authenticated) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authResult.error }),
      };
    }

    if (!authResult.authorized) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: authResult.error }),
      };
    }

    const id = event.path.split("/").pop();

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Team member ID is required" }),
      };
    }

    const db = await initializeDatabase();

    const result = await db.runAsync(
      `
      DELETE FROM team_members
      WHERE id = ?
    `,
      [id]
    );

    if (result.changes === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Team member not found" }),
      };
    }

    return {
      statusCode: 204,
      headers,
    };
  } catch (error) {
    console.error("Error deleting team member:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete team member" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
