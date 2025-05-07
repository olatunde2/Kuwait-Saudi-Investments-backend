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

  try {
    await initializeDatabase();

    const pathParts = event.path.split("/");
    const id = pathParts[pathParts.length - 1];

    const queryParams = event.queryStringParameters || {};
    const pageId = queryParams.pageId;

    // Fetch comment by ID
    if (id && !isNaN(id) && pathParts[pathParts.length - 2] === "comments") {
      const result = await query(
        `
        SELECT c.id, c.content, c.page_id as "pageId", 
               c.parent_id as "parentId", c.user_id as "userId", 
               c.guest_name as "guestName", 
               c.created_at as "createdAt", c.updated_at as "updatedAt",
               u.display_name as "userDisplayName"
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Comment not found" }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    // Fetch comments for a page
    if (pageId) {
      const result = await query(
        `
        SELECT c.id, c.content, c.page_id as "pageId", 
               c.parent_id as "parentId", c.user_id as "userId", 
               c.guest_name as "guestName", 
               c.created_at as "createdAt", c.updated_at as "updatedAt",
               u.display_name as "userDisplayName"
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.page_id = $1
        ORDER BY c.created_at ASC
        `,
        [pageId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: result.rows }),
      };
    }

    // No valid params
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "Missing required query parameter: pageId",
      }),
    };
  } catch (error) {
    console.error("Error fetching comments:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch comments" }),
    };
  } finally {
    closeDatabase();
  }
}
