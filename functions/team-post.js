import { isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, closeDatabase } from "./database.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };
  
  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers
    };
  }
  
  if (event.httpMethod !== "POST") {
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
    
    const { name, position, bio, imageUrl } = JSON.parse(event.body);
    
    if (!name || !position || !bio) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Name, position, and bio are required" })
      };
    }
    
    const db = await initializeDatabase();
    
    const result = await db.runAsync(`
      INSERT INTO team_members (name, position, bio, image_url)
      VALUES (?, ?, ?, ?)
    `, [name, position, bio, imageUrl]);
    
    const teamMember = await db.getAsync(`
      SELECT id, name, position, bio, image_url as imageUrl, created_at as createdAt
      FROM team_members
      WHERE id = ?
    `, [result.lastID]);
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(teamMember)
    };
  } catch (error) {
    console.error("Error creating team member:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to create team member" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
