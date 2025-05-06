import { verifyToken } from "../auth.js";

/**
 * Authentication middleware for Netlify Functions
 */
export function isAuthenticated(event) {
  try {
    // Get the authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Not authenticated' };
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const user = verifyToken(token);
    
    if (!user) {
      return { authenticated: false, error: 'Invalid token' };
    }
    
    return { authenticated: true, user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false, error: 'Authentication error' };
  }
}

/**
 * Admin authentication middleware for Netlify Functions
 */
export function isAdmin(event) {
  const authResult = isAuthenticated(event);
  
  if (!authResult.authenticated) {
    return authResult;
  }
  
  if (!authResult.user.isAdmin) {
    return { authenticated: true, authorized: false, error: 'Not authorized' };
  }
  
  return { authenticated: true, authorized: true, user: authResult.user };
}
