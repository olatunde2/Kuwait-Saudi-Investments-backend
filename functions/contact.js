import { initializeDatabase, query, closeDatabase } from "./database.js";
import { isAdmin } from "./utils/auth-middleware.js";

export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  try {
    await initializeDatabase();

    // POST - anyone can submit a contact message
    if (event.httpMethod === "POST") {
      const { name, email, subject, message } = JSON.parse(event.body);

      if (!name || !email || !message) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "Name, email, and message are required",
          }),
        };
      }

      const now = new Date().toISOString();

      const result = await query(
        `
        INSERT INTO contact_messages (name, email, subject, message, date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
        [name, email, subject, message, now]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: "Contact message sent successfully",
          id: result.rows[0].id,
        }),
      };
    }

    // Admin routes
    const authResult = isAdmin(event);

    if (!authResult.authenticated) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authResult.error }),
      };
    }

    if (!authResult.authorized) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: authResult.error }),
      };
    }

    // GET - fetch one or all contact messages
    if (event.httpMethod === "GET") {
      const id = event.path.split("/").pop();

      if (id && !isNaN(id)) {
        const result = await query(
          `
          SELECT id, name, email, subject, message, date, is_read as "isRead"
          FROM contact_messages
          WHERE id = $1
        `,
          [id]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Contact message not found" }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      }

      const result = await query(`
        SELECT id, name, email, subject, message, date, is_read as "isRead"
        FROM contact_messages
        ORDER BY date DESC
      `);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: result.rows }),
      };
    }

    // PUT - update is_read status
    if (event.httpMethod === "PUT") {
      const id = event.path.split("/").pop();

      if (!id || isNaN(id)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Valid message ID is required" }),
        };
      }

      const { isRead } = JSON.parse(event.body);

      if (typeof isRead !== "boolean") {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "isRead field must be a boolean" }),
        };
      }

      const updateResult = await query(
        `
        UPDATE contact_messages
        SET is_read = $1
        WHERE id = $2
        RETURNING id
      `,
        [isRead, id]
      );

      if (updateResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Contact message not found" }),
        };
      }

      const messageResult = await query(
        `
        SELECT id, name, email, subject, message, date, is_read as "isRead"
        FROM contact_messages
        WHERE id = $1
      `,
        [id]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(messageResult.rows[0]),
      };
    }

    // DELETE - delete contact message
    if (event.httpMethod === "DELETE") {
      const id = event.path.split("/").pop();

      if (!id || isNaN(id)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Valid message ID is required" }),
        };
      }

      const deleteResult = await query(
        `
        DELETE FROM contact_messages
        WHERE id = $1
        RETURNING id
      `,
        [id]
      );

      if (deleteResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Contact message not found" }),
        };
      }

      return {
        statusCode: 204,
        headers,
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Error handling contact messages:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  } finally {
    closeDatabase();
  }
}
