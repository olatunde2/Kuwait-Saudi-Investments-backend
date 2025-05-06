import { initializeDatabase, closeDatabase } from "./database.js";
import { isAdmin } from "./utils/auth-middleware.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  };
  
  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    const db = await initializeDatabase();
    
    // GET request - fetch about sections
    if (event.httpMethod === "GET") {
      const sections = await db.allAsync(`
        SELECT id, title, content, order_index as orderIndex, image_url as imageUrl, created_at as createdAt
        FROM about_sections
        ORDER BY order_index ASC
      `);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: sections })
      };
    }
    
    // For other methods, check admin authentication
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
    
    // POST request - create a new about section
    if (event.httpMethod === "POST") {
      const { title, content, orderIndex, imageUrl } = JSON.parse(event.body);
      
      if (!title || !content || orderIndex === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Title, content, and orderIndex are required" })
        };
      }
      
      const result = await db.runAsync(`
        INSERT INTO about_sections (title, content, order_index, image_url)
        VALUES (?, ?, ?, ?)
      `, [title, content, orderIndex, imageUrl]);
      
      const section = await db.getAsync(`
        SELECT id, title, content, order_index as orderIndex, image_url as imageUrl, created_at as createdAt
        FROM about_sections
        WHERE id = ?
      `, [result.lastID]);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(section)
      };
    }
    
    // PUT request - update an about section
    if (event.httpMethod === "PUT") {
      const id = event.path.split("/").pop();
      
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "About section ID is required" })
        };
      }
      
      const { title, content, orderIndex, imageUrl } = JSON.parse(event.body);
      
      if (!title || !content || orderIndex === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Title, content, and orderIndex are required" })
        };
      }
      
      const result = await db.runAsync(`
        UPDATE about_sections
        SET title = ?, content = ?, order_index = ?, image_url = ?
        WHERE id = ?
      `, [title, content, orderIndex, imageUrl, id]);
      
      if (result.changes === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "About section not found" })
        };
      }
      
      const section = await db.getAsync(`
        SELECT id, title, content, order_index as orderIndex, image_url as imageUrl, created_at as createdAt
        FROM about_sections
        WHERE id = ?
      `, [id]);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(section)
      };
    }
    
    // DELETE request - delete an about section
    if (event.httpMethod === "DELETE") {
      const id = event.path.split("/").pop();
      
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "About section ID is required" })
        };
      }
      
      const result = await db.runAsync(`
        DELETE FROM about_sections
        WHERE id = ?
      `, [id]);
      
      if (result.changes === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "About section not found" })
        };
      }
      
      return {
        statusCode: 204,
        headers
      };
    }
    
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  } catch (error) {
    console.error("Error with about sections:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
