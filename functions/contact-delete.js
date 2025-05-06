import { isAuthenticated, isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, query, closeDatabase } from "./database.js";

export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "DELETE,OPTIONS",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  // Only allow DELETE
  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Auth check
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
    const id = event.path.split("/").pop();
    if (!id || isNaN(id)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid or missing contact message ID",
        }),
      };
    }

    await initializeDatabase();

    const result = await query(
      `DELETE FROM contact_messages WHERE id = $1 RETURNING id`,
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
      statusCode: 204,
      headers,
    };
  } catch (error) {
    console.error("Error deleting contact message:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete contact message" }),
    };
  } finally {
    closeDatabase();
  }
}
