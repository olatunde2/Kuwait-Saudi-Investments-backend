import { initializeDatabase, query, closeDatabase } from "./database.js";
import { isAuthenticated, isAdmin } from "./utils/auth-middleware.js";
import cors from "./utils/cors.js";

export async function handler(event, context) {
  const headers = cors();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "DELETE") {
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

    const authResult = isAuthenticated(event);
    if (!authResult.authenticated) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Authentication required" }),
      };
    }

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
          error: "Not authorized to delete this comment",
        }),
      };
    }

    await query(`DELETE FROM comments WHERE id = $1`, [id]);

    return {
      statusCode: 204,
      headers,
    };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete comment" }),
    };
  } finally {
    closeDatabase();
  }
}
