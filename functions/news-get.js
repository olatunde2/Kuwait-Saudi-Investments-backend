import { initializeDatabase, closeDatabase } from "./database.js";

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
    const id = event.path.split("/").pop();
    
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "News article ID is required" })
      };
    }
    
    const db = await initializeDatabase();
    
    const newsItem = await db.getAsync(`
      SELECT id, title, summary, content, category, date, image_url as imageUrl, created_at as createdAt
      FROM news_articles
      WHERE id = ?
    `, [id]);
    
    if (!newsItem) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "News article not found" })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(newsItem)
    };
  } catch (error) {
    console.error("Error fetching news article:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch news article" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
