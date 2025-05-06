import { initializeDatabase, query, closeDatabase } from "./database.js";
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
    await initializeDatabase();
    
    // POST request - submit a contact form
    if (event.httpMethod === "POST") {
      const { name, email, subject, message } = JSON.parse(event.body);
      
      if (!name || !email || !message) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Name, email, and message are required" })
        };
      }
      
      const date = new Date().toISOString();
      
      const result = await query(`
        INSERT INTO contact_submissions (name, email, subject, message, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [name, email, subject, message, date]);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          message: "Contact message sent successfully",
          id: result.rows[0].id
        })
      };
    }
    
    // For GET, PUT, DELETE requests, check admin authentication
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
    
    // GET request - fetch contact messages (admin only)
    if (event.httpMethod === "GET") {
      // Check if it's a specific message
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
            body: JSON.stringify({ error: "Contact message not found" })
          };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0])
        };
      }
      
      // Get all messages
      const result = await query(`
        SELECT id, name, email, subject, message, date, is_read as "isRead"
        FROM contact_messages
        ORDER BY date DESC
      `);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: result.rows })
      };
    }
    
    // PUT request - mark a message as read (admin only)
    if (event.httpMethod === "PUT") {
      const id = event.path.split("/").pop();
      
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Contact message ID is required" })
        };
      }
      
      const { isRead } = JSON.parse(event.body);
      
      if (isRead === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "isRead field is required" })
        };
      }
      
      const updateResult = await query(`
        UPDATE contact_messages
        SET is_read = $1
        WHERE id = $2
        RETURNING id
      `, [isRead ? true : false, id]);
      
      if (updateResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Contact message not found" })
        };
      }
      
      const messageResult = await query(`
        SELECT id, name, email, subject, message, date, is_read as "isRead"
        FROM contact_messages
        WHERE id = $1
      `, [id]);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(messageResult.rows[0])
      };
    }
    
    // DELETE request - delete a contact message (admin only)
    if (event.httpMethod === "DELETE") {
      const id = event.path.split("/").pop();
      
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Contact message ID is required" })
        };
      }
      
      const result = await query(`
        DELETE FROM contact_messages
        WHERE id = $1
        RETURNING id
      `, [id]);
      
      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Contact message not found" })
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
    console.error("Error with contact messages:", error);
    
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
