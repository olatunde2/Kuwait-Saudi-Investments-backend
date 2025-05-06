import { initializeDatabase, query, closeDatabase } from "./database.js";
import { isAuthenticated, isAdmin } from "./utils/auth-middleware.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "DELETE,OPTIONS"
  };
  
  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers
    };
  }
  
  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    await initializeDatabase();
    
    const id = event.path.split("/").pop();
    
    if (!id || isNaN(id)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Valid comment ID is required" })
      };
    }
    
    // Check authentication
    const authResult = isAuthenticated(event);
    
    if (!authResult.authenticated) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Authentication required" })
      };
    }
    
    // Get comment to check ownership
    const commentResult = await query(`
      SELECT id, user_id
      FROM comments
      WHERE id = $1
    `, [id]);
    
    if (commentResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Comment not found" })
      };
    }
    
    const comment = commentResult.rows[0];
    const isUserAdmin = isAdmin(event).isAdmin;
    
    // Check if user owns the comment or is admin
    if (comment.user_id !== authResult.user.id && !isUserAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Not authorized to delete this comment" })
      };
    }
    
    // Delete the comment (cascade will delete replies too if foreign key is set up properly)
    await query(`
      DELETE FROM comments
      WHERE id = $1
    `, [id]);
    
    return {
      statusCode: 204,
      headers
    };
  } catch (error) {
    console.error("Error deleting comment:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete comment" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}