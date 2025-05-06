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
      SELECT id, slug, title, description
      FROM investment_groups
      ORDER BY title ASC
    `);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result.rows })
    };
  } catch (error) {
    console.error("Error fetching investment groups:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch investment groups" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
