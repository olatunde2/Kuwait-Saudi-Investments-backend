import { isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, closeDatabase } from "./database.js";
import cors from "./utils/cors.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = cors;

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

    const { title, description, groupId, roi, imageUrl } = JSON.parse(
      event.body
    );

    if (!title || !description || !groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Title, description, and groupId are required",
        }),
      };
    }

    const db = await initializeDatabase();

    // Check if group exists
    const group = await db.getAsync(
      `
      SELECT id FROM investment_groups WHERE slug = ?
    `,
      [groupId]
    );

    if (!group) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Investment group not found" }),
      };
    }

    const result = await db.runAsync(
      `
      INSERT INTO investments (title, description, group_id, roi, image_url)
      VALUES (?, ?, ?, ?, ?)
    `,
      [title, description, groupId, roi, imageUrl]
    );

    const investment = await db.getAsync(
      `
      SELECT i.id, i.title, i.description, i.group_id as groupId, i.roi, 
             i.image_url as imageUrl, i.created_at as createdAt,
             g.title as groupName
      FROM investments i
      LEFT JOIN investment_groups g ON i.group_id = g.slug
      WHERE i.id = ?
    `,
      [result.lastID]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(investment),
    };
  } catch (error) {
    console.error("Error creating investment:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to create investment" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
