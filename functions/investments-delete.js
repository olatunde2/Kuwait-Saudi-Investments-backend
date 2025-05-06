import { isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, closeDatabase } from "./database.js";

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
    // Check admin authentication
    const authResult = isAdmin(event);
    
    if (!authResult.authenticated) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }
    
    if (!authResult.authorized) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }
    
    const id = event.path.split("/").pop();
    
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Investment ID is required" })
      };
    }
    
    const db = await initializeDatabase();
    
    const result = await db.runAsync(`
      DELETE FROM investments
      WHERE id = ?
    `, [id]);
    
    if (result.changes === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Investment not found" })
      };
    }
    
    return {
      statusCode: 204,
      headers
    };
  } catch (error) {
    console.error("Error deleting investment:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete investment" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
