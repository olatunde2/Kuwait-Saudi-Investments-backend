import { isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, closeDatabase } from "./database.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
  };

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
        body: JSON.stringify({ error: "News article ID is required" }),
      };
    }

    const { title, summary, content, category, date, imageUrl } = JSON.parse(
      event.body
    );

    if (!title || !summary || !content || !category || !date) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Title, summary, content, category, and date are required",
        }),
      };
    }

    const db = await initializeDatabase();

    const result = await db.runAsync(
      `
      UPDATE news
      SET title = ?, summary = ?, content = ?, category = ?, published_date = ?, image_url = ?
      WHERE id = ?
    `,
      [title, summary, content, category, date, imageUrl, id]
    );

    // Check if any row was updated
    if (result.changes === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "News article not found" }),
      };
    }

    const newsItem = await db.getAsync(
      `
      SELECT id, title, summary, content, category, published_date as date, image_url as imageUrl, created_at as createdAt
      FROM news
      WHERE id = ?
    `,
      [id]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(newsItem),
    };
  } catch (error) {
    console.error("Error updating news article:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to update news article" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
