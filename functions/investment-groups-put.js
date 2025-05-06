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

  if (event.httpMethod !== "PUT") {
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

    const { slug, title, description } = JSON.parse(event.body);

    if (!slug || !title || !description) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Slug, title, and description are required",
        }),
      };
    }

    const db = await initializeDatabase();

    // Check if updating to a slug that's already in use by another group
    const existingGroup = await db.getAsync(
      `
      SELECT id FROM investment_groups WHERE slug = ? AND id != ?
    `,
      [slug, id]
    );

    if (existingGroup) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Slug already in use" }),
      };
    }

    const result = await db.runAsync(
      `
      UPDATE investment_groups
      SET slug = ?, title = ?, description = ?
      WHERE id = ?
    `,
      [slug, title, description, id]
    );

    if (result.changes === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Investment group not found" }),
      };
    }

    const group = await db.getAsync(
      `
      SELECT id, slug, title, description, created_at as createdAt
      FROM investment_groups
      WHERE id = ?
    `,
      [id]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(group),
    };
  } catch (error) {
    console.error("Error updating investment group:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to update investment group" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
