import { handler as getHandler } from "./comments-get.js";
import { handler as postHandler } from "./comments-post.js";
import { handler as putHandler } from "./comments-put.js";
import { handler as deleteHandler } from "./comments-delete.js";
import { cors } from "./utils/cors.js";

export async function handler(event, context) {
  // Set up CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  // Route to the appropriate handler based on the HTTP method
  switch (event.httpMethod) {
    case "GET":
      return getHandler(event, context);
    case "POST":
      return postHandler(event, context);
    case "PUT":
      return putHandler(event, context);
    case "DELETE":
      return deleteHandler(event, context);
    default:
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
  }
}
