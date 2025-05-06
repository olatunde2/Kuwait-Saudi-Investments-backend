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
    const id = event.path.split("/").pop();
    
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Investment ID is required" })
      };
    }
    
    const db = await initializeDatabase();
    
    const investment = await db.getAsync(`
      SELECT i.id, i.title, i.description, i.group_id as groupId, i.roi, 
             i.image_url as imageUrl, i.created_at as createdAt,
             g.title as groupName
      FROM investments i
      LEFT JOIN investment_groups g ON i.group_id = g.slug
      WHERE i.id = ?
    `, [id]);
    
    if (!investment) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Investment not found" })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(investment)
    };
  } catch (error) {
    console.error("Error fetching investment:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch investment" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
