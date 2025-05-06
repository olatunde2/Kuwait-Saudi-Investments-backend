import { initializeDatabase, query, closeDatabase } from "./database.js";
import { isAuthenticated } from "./utils/auth-middleware.js";
import { cors } from "./utils/cors.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = cors();

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    await initializeDatabase();

    const { content, entityType, entityId, parentId, guestName } = JSON.parse(
      event.body
    );

    if (!content || !entityType || !entityId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Content, entityType, and entityId are required",
        }),
      };
    }

    let userId = null;
    let userDisplayName = null;

    // Check if user is authenticated
    const authResult = isAuthenticated(event);
    if (authResult.authenticated) {
      userId = authResult.user.id;
      userDisplayName = authResult.user.displayName;
    } else if (!guestName) {
      // If not authenticated and no guest name provided
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Guest name is required when not authenticated",
        }),
      };
    }

    // Insert new comment
    const result = await query(
      `
      INSERT INTO comments (content, entity_type, entity_id, parent_id, user_id, guest_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `,
      [
        content,
        entityType,
        entityId,
        parentId || null,
        userId,
        userId ? null : guestName,
      ]
    );

    const commentId = result.rows[0].id;

    // Fetch the created comment
    const commentResult = await query(
      `
      SELECT c.id, c.content, c.entity_type as "entityType", c.entity_id as "entityId", 
             c.parent_id as "parentId", c.user_id as "userId", c.guest_name as "guestName", 
             c.created_at as "createdAt", c.updated_at as "updatedAt",
             u.display_name as "userDisplayName"
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `,
      [commentId]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(commentResult.rows[0]),
    };
  } catch (error) {
    console.error("Error creating comment:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to create comment" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
