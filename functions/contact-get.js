import { isAuthenticated, isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, query, closeDatabase } from "./database.js";
import cors from "./utils/cors.js";

export async function handler(event, context) {
  const headers = cors();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Authenticate and authorize
  const authResult = isAuthenticated(event);
  if (!authResult.authenticated) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: authResult.error || "Authentication required",
      }),
    };
  }

  const adminResult = isAdmin(event);
  if (!adminResult.authorized) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: adminResult.error || "Admin access required",
      }),
    };
  }

  try {
    await initializeDatabase();

    const id = event.path.split("/").pop();
    if (id && !isNaN(id)) {
      const result = await query(
        `
        SELECT id, name, email, subject, message, date, is_read AS "isRead"
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

    // Get all contact messages
    const result = await query(`
      SELECT id, name, email, subject, message, date, is_read AS "isRead"
      FROM contact_messages
      ORDER BY date DESC
    `);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result.rows }),
    };
  } catch (error) {
    console.error("Error fetching contact messages:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch contact messages" }),
    };
  } finally {
    closeDatabase();
  }
}
