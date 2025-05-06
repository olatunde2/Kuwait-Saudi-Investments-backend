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
        body: JSON.stringify({ error: "Investment group ID is required" }),
      };
    }

    const db = await initializeDatabase();

    // Check if there are investments using this group
    const groupSlug = await db.getAsync(
      `
      SELECT slug FROM investment_groups WHERE id = ?
    `,
      [id]
    );

    if (!groupSlug) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Investment group not found" }),
      };
    }

    const investments = await db.allAsync(
      `
      SELECT id FROM investments WHERE group_id = ?
    `,
      [groupSlug.slug]
    );

    if (investments.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Cannot delete group with associated investments. Remove investments first.",
        }),
      };
    }

    const result = await db.runAsync(
      `
      DELETE FROM investment_groups
      WHERE id = ?
    `,
      [id]
    );

    if (result.changes === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Investment group not found" }),
      };
    }

    return {
      statusCode: 204,
      headers,
    };
  } catch (error) {
    console.error("Error deleting investment group:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete investment group" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
