export async function handler(event, context) {
  // Set up CORS headers with specific origin and allow credential
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  };

  // Handle preflight requests (OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  // Handle GET request for API documentation (list available endpoints)
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        api: "Investment Portal API",
        version: "1.0.0",
        endpoints: [
          { path: "/api/login", method: "POST", description: "User login" },
          {
            path: "/api/register",
            method: "POST",
            description: "User registration",
          },
          { path: "/api/logout", method: "POST", description: "User logout" },
          { path: "/api/user", method: "GET", description: "Get current user" },
          {
            path: "/api/team",
            method: "GET",
            description: "Get all team members",
          },
          {
            path: "/api/team/:id",
            method: "GET",
            description: "Get a specific team member",
          },
          {
            path: "/api/news",
            method: "GET",
            description: "Get all news articles",
          },
          {
            path: "/api/news/:id",
            method: "GET",
            description: "Get a specific news article",
          },
          {
            path: "/api/investment-groups",
            method: "GET",
            description: "Get all investment groups",
          },
          {
            path: "/api/investment-groups/:slug",
            method: "GET",
            description: "Get a specific investment group",
          },
          {
            path: "/api/investments",
            method: "GET",
            description: "Get all investments",
          },
          {
            path: "/api/investments/:id",
            method: "GET",
            description: "Get a specific investment",
          },
        ],
      }),
    };
  }

  // Handle POST requests for different endpoints (comments, login, register, etc.)
  if (event.httpMethod === "POST") {
    switch (event.path) {
      case "/api/comments":
        // Placeholder logic for comment submission
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ message: "Comment submitted successfully" }),
        };

      case "/api/login":
        // Logic for user login (this is just a placeholder)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Login successful" }),
        };

      case "/api/register":
        // Logic for user registration (this is just a placeholder)
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ message: "User registered successfully" }),
        };

      case "/api/logout":
        // Logic for user logout (this is just a placeholder)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Logout successful" }),
        };

      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Not Found" }),
        };
    }
  }

  // Handle unsupported HTTP methods
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" }),
  };
}
