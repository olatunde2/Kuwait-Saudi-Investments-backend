import { isAuthenticated, isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, query, closeDatabase } from "./database.js";

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
    
    await initializeDatabase();
    
    const result = await query('DELETE FROM contact_submissions WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Contact submission not found" })
      };
    }
    
    return {
      statusCode: 204,
      headers
    };
  } catch (error) {
    console.error("Error deleting contact submission:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete contact submission" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}