import { isAuthenticated, isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, query, closeDatabase } from "./database.js";
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

  // Check authentication and admin status
  const authResult = isAuthenticated(event);
  if (!authResult.authenticated) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Authentication required" }),
    };
  }

  const adminResult = isAdmin(event);
  if (!adminResult.isAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: "Admin access required" }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { title, content, orderIndex, imageUrl } = body;

    if (!title || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Title and content are required" }),
      };
    }

    await initializeDatabase();

    // Get the maximum order index if not provided
    let index = orderIndex;
    if (index === undefined) {
      const maxResult = await query(
        "SELECT MAX(order_index) as max FROM about_sections"
      );
      index = maxResult.rows[0].max ? maxResult.rows[0].max + 1 : 0;
    }

    const now = new Date().toISOString();

    const result = await query(
      `
      INSERT INTO about_sections (title, content, order_index, image_url, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, content, order_index as "orderIndex", image_url as "imageUrl", 
                created_at as "createdAt"
    `,
      [title, content, index, imageUrl || null, now]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    console.error("Error creating about section:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to create about section" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
