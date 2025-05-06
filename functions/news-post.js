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

    const {
      title,
      content,
      imageUrl,
      publishedDate,
      author,
      source,
      isFeatured,
    } = JSON.parse(event.body);

    if (!title || !content || !publishedDate || !author || !source) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Title, content, published date, author, and source are required",
        }),
      };
    }

    const db = await initializeDatabase();

    const result = await db.runAsync(
      `
      INSERT INTO news (title, content, image_url, published_date, author, source, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [title, content, imageUrl, publishedDate, author, source, isFeatured]
    );

    const newsItem = await db.getAsync(
      `
      SELECT id, title, content, image_url as imageUrl, published_date as publishedDate,
             author, source, is_featured as isFeatured, created_at as createdAt, updated_at as updatedAt
      FROM news
      WHERE id = ?
    `,
      [result.lastID]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(newsItem),
    };
  } catch (error) {
    console.error("Error creating news article:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to create news article" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
