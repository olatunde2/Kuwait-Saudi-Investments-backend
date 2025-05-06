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
      SELECT i.id, i.title, i.description, i.group_id as "groupId", i.roi, 
             i.image_url as "imageUrl",
             g.title as "groupName"
      FROM investments i
      LEFT JOIN investment_groups g ON i.group_id = g.slug
    `);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result.rows })
    };
  } catch (error) {
    console.error("Error fetching investments:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch investments" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
