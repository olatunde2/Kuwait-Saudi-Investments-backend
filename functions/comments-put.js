import { initializeDatabase, query, closeDatabase } from "./database.js";
import { isAuthenticated, isAdmin } from "./utils/auth-middleware.js";

export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "PUT") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    await initializeDatabase();

    const id = event.path.split("/").pop();

    if (!id || isNaN(id)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Valid comment ID is required" }),
      };
    }

    const { content } = JSON.parse(event.body);

    if (!content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Content is required" }),
      };
    }

    const authResult = isAuthenticated(event);
    if (!authResult.authenticated) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Authentication required" }),
      };
    }

    // Get comment and validate access
    const commentResult = await query(
      `SELECT id, user_id FROM comments WHERE id = $1`,
      [id]
    );

    if (commentResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Comment not found" }),
      };
    }

    const comment = commentResult.rows[0];
    const isUserAdmin = isAdmin(event).isAdmin;

    if (comment.user_id !== authResult.user.id && !isUserAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: "Not authorized to update this comment",
        }),
      };
    }

    // Update comment
    await query(
      `UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [content, id]
    );

    // Return updated comment
    const updatedResult = await query(
      `
      SELECT c.id, c.content, c.page_id as "pageId", 
             c.parent_id as "parentId", c.user_id as "userId", 
             c.guest_name as "guestName", 
             c.created_at as "createdAt", c.updated_at as "updatedAt",
             u.display_name as "userDisplayName"
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
      `,
      [id]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(updatedResult.rows[0]),
    };
  } catch (error) {
    console.error("Error updating comment:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to update comment" }),
    };
  } finally {
    closeDatabase();
  }
}
