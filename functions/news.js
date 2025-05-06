import { initializeDatabase, query, closeDatabase } from "./database.js";
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
    // Initialize the database connection
    await initializeDatabase();

    // Query for all news articles
    const result = await query(`
      SELECT id, title, summary, content, category, date, image_url AS "imageUrl"
      FROM news_articles
      ORDER BY date DESC
    `);

    // Check if no articles were found
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "No news articles found" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result.rows }),
    };
  } catch (error) {
    console.error("Error fetching news:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch news" }),
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
