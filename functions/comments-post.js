import { initializeDatabase, query, closeDatabase } from "./database.js";
import { isAuthenticated } from "./utils/auth-middleware.js";
import cors from "./utils/cors.js";

export async function handler(event, context) {
  const headers = cors();

  // Handle CORS preflight
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
    await initializeDatabase();

    const { content, page_id, parent_id, user_id, guestName } = JSON.parse(
      event.body
    );

    if (!content || !page_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing required fields: content and page_id",
        }),
      };
    }

    let finalUserId = null;
    let finalGuestName = null;

    // Check authentication
    const authResult = isAuthenticated(event);
    if (authResult.authenticated) {
      finalUserId = authResult.user.id;
    } else if (guestName) {
      finalGuestName = guestName;
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Guest name is required if not authenticated",
        }),
      };
    }

    // Insert comment
    const result = await query(
      `
      INSERT INTO comments (content, page_id, parent_id, user_id, guest_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
      `,
      [content, page_id, parent_id || null, finalUserId, finalGuestName]
    );

    const commentId = result.rows[0].id;

    // Fetch the inserted comment
    const commentResult = await query(
      `
      SELECT c.id, c.content, c.page_id as "pageId", c.parent_id as "parentId", 
             c.user_id as "userId", c.guest_name as "guestName",
             c.created_at as "createdAt", c.updated_at as "updatedAt",
             u.display_name as "userDisplayName"
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
      `,
      [commentId]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(commentResult.rows[0]),
    };
  } catch (error) {
    console.error("Error in comment handler:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to create comment" }),
    };
  } finally {
    closeDatabase();
  }
}
