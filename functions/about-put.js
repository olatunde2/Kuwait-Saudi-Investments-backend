import { isAuthenticated, isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, query, closeDatabase } from "./database.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "PUT,OPTIONS"
  };
  
  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers
    };
  }
  
  if (event.httpMethod !== "PUT") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  // Check authentication and admin status
  const authResult = isAuthenticated(event);
  if (!authResult.authenticated) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Authentication required" })
    };
  }

  const adminResult = isAdmin(event);
  if (!adminResult.isAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: "Admin access required" })
    };
  }

  try {
    const id = event.path.split("/").pop();
    const body = JSON.parse(event.body);
    const { title, content, orderIndex, imageUrl } = body;
    
    if (!title || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Title and content are required" })
      };
    }
    
    await initializeDatabase();
    
    const result = await query(`
      UPDATE about_sections 
      SET title = $1, content = $2, order_index = $3, image_url = $4
      WHERE id = $5
      RETURNING id, title, content, order_index as "orderIndex", image_url as "imageUrl", 
                created_at as "createdAt"
    `, [title, content, orderIndex, imageUrl || null, id]);
    
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "About section not found" })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.rows[0])
    };
  } catch (error) {
    console.error("Error updating about section:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to update about section" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}