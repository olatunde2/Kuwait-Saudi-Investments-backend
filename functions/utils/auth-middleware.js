import { verifyToken } from "../auth.js";

export async function isAuthenticated(event) {
  const authHeader =
    event.headers?.Authorization || event.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing or invalid token" };
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return { authenticated: false, error: "Invalid token" };
    }
    return { authenticated: true, user: decoded };
  } catch (err) {
    console.error("Error verifying token:", err);
    return { authenticated: false, error: "Invalid token" };
  }
}

export function isAdmin(event) {
  const authResult = isAuthenticated(event);

  if (!authResult.authenticated) {
    return authResult;
  }

  if (!authResult.user.isAdmin) {
    return { authenticated: true, authorized: false, error: "Not authorized" };
  }

  return { authenticated: true, authorized: true, user: authResult.user };
}
