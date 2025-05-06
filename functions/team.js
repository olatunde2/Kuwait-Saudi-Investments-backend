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

  try {
    await initializeDatabase();
    
    const result = await query(`
      SELECT id, name, position AS role, bio, image_url AS imageurl
      FROM team_members
      ORDER BY name ASC
    `);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result.rows })
    };
  } catch (error) {
    console.error("Error fetching team members:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch team members" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
