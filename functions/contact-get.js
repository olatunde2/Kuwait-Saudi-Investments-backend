import { isAuthenticated, isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, query, closeDatabase } from "./database.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS"
  };
  
  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers
    };
  }
  
  if (event.httpMethod !== "GET") {
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
    await initializeDatabase();
    
    // Check if we're fetching a specific contact submission
    const id = event.path.split("/").pop();
    if (id && !isNaN(id)) {
      const result = await query(`
        SELECT id, name, email, subject, message, created_at as "createdAt"
        FROM contact_submissions
        WHERE id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Contact submission not found" })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }
    
    // Otherwise, fetch all contact submissions
    const result = await query(`
      SELECT id, name, email, subject, message, created_at as "createdAt"
      FROM contact_submissions
      ORDER BY created_at DESC
    `);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result.rows })
    };
  } catch (error) {
    console.error("Error fetching contact submissions:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch contact submissions" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}