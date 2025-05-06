import { initializeDatabase, closeDatabase } from "./database.js";
import cors from "./utils/cors.js";

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

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const id = event.path.split("/").pop();

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Team member ID is required" }),
      };
    }

    const db = await initializeDatabase();

    const teamMember = await db.getAsync(
      `
      SELECT id, name, position, bio, image_url as imageUrl, created_at as createdAt
      FROM team_members
      WHERE id = ?
    `,
      [id]
    );

    if (!teamMember) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Team member not found" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(teamMember),
    };
  } catch (error) {
    console.error("Error fetching team member:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch team member" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
