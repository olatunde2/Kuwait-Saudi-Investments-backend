import { isAdmin } from "./utils/auth-middleware.js";
import { initializeDatabase, closeDatabase } from "./database.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };
  
  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers
    };
  }
  
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    // Check admin authentication
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
    
    const { title, summary, content, category, date, imageUrl } = JSON.parse(event.body);
    
    if (!title || !summary || !content || !category || !date) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Title, summary, content, category, and date are required" })
      };
    }
    
    const db = await initializeDatabase();
    
    const result = await db.runAsync(`
      INSERT INTO news_articles (title, summary, content, category, date, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, summary, content, category, date, imageUrl]);
    
    const newsItem = await db.getAsync(`
      SELECT id, title, summary, content, category, date, image_url as imageUrl, created_at as createdAt
      FROM news_articles
      WHERE id = ?
    `, [result.lastID]);
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(newsItem)
    };
  } catch (error) {
    console.error("Error creating news article:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to create news article" })
    };
  } finally {
    // Close database connection
    closeDatabase();
  }
}
