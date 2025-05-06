import { initializeDatabase, closeDatabase } from "./database.js";

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
    const slug = event.path.split("/").pop();
    
    if (!slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Investment group slug is required" })
      };
    }
    
    const db = await initializeDatabase();
    
    const group = await db.getAsync(`
      SELECT id, slug, title, description, created_at as createdAt
      FROM investment_groups
      WHERE slug = ?
    `, [slug]);
    
    if (!group) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Investment group not found" })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(group)
    };
  } catch (error) {
    console.error("Error fetching investment group:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch investment group" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
