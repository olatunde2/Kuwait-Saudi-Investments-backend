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
    
    // Check if we're fetching a specific comment
    const pathParts = event.path.split("/");
    const id = pathParts[pathParts.length - 1]; 
    
    // Get URL parameters
    const queryParams = event.queryStringParameters || {};
    const entityType = queryParams.entityType;
    const entityId = queryParams.entityId;
    
    // If there's an ID path parameter and it's a number, get that specific comment
    if (id && !isNaN(id) && pathParts[pathParts.length - 2] === "comments") {
      const result = await query(`
        SELECT c.id, c.content, c.entity_type as "entityType", c.entity_id as "entityId", 
               c.parent_id as "parentId", c.user_id as "userId", c.guest_name as "guestName", 
               c.created_at as "createdAt", c.updated_at as "updatedAt",
               u.display_name as "userDisplayName"
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Comment not found" })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }
    
    // If entity type and entity id are provided, get comments for that entity
    if (entityType && entityId) {
      const result = await query(`
        SELECT c.id, c.content, c.entity_type as "entityType", c.entity_id as "entityId", 
               c.parent_id as "parentId", c.user_id as "userId", c.guest_name as "guestName", 
               c.created_at as "createdAt", c.updated_at as "updatedAt",
               u.display_name as "userDisplayName"
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.entity_type = $1 AND c.entity_id = $2
        ORDER BY c.created_at ASC
      `, [entityType, entityId]);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: result.rows })
      };
    }
    
    // If no specific filter is provided, return an error
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "entityType and entityId parameters are required" })
    };
  } catch (error) {
    console.error("Error fetching comments:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch comments" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}