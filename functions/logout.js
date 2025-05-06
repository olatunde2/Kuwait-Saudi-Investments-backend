import cors from "./utils/cors";

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

  // In a JWT-based authentication system, logout is handled client-side
  // by removing the token from storage. The server doesn't need to do anything.
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: "Logged out successfully" }),
  };
}
