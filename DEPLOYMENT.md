# Deploying the Serverless Investment Portal

This guide covers how to deploy this serverless investment portal application to Netlify.

## Prerequisites

- A Netlify account
- A PostgreSQL database (Netlify can connect to any PostgreSQL service like Neon, Supabase, or Railway)
- Git repository with your code

## Step 1: Set up environment variables

You'll need to set up the following environment variables in your Netlify dashboard:

- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: A secure secret for JWT token generation
- `NODE_VERSION`: 18 (or your preferred Node.js version)

## Step 2: Deploy to Netlify

1. Connect your Git repository to Netlify
2. Set the build command to: `npm install`
3. Set the publish directory to: `public`
4. Set environment variables in the Netlify dashboard
5. Deploy!

## Step 3: Database Migration

Before using the application, you'll need to set up the database schema:

1. Connect to your PostgreSQL database using a client like psql or a GUI tool
2. Run the schema file from `db/schema.sql`

## Netlify Functions Configuration

The `netlify.toml` file already includes the necessary configuration for serverless functions:

```toml
[build]
  functions = "functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

This configuration:
1. Tells Netlify where to find your functions
2. Sets up API path redirects so your frontend can use clean URLs like `/api/investments` instead of `/.netlify/functions/investments`

## Serverless Functions Structure

The application is organized into individual serverless functions:

- `functions/*.js`: Each file is an independent serverless function
- Functions with `-get.js`, `-post.js`, etc. handle specific HTTP methods
- Functions without method suffixes (like `investments.js`) handle routing

## Testing Your Deployment

After deployment:

1. Visit your Netlify URL
2. Test API endpoints using your browser or Postman:
   - `/api/investments`
   - `/api/investment-groups`
   - `/api/news`
   - `/api/team`
   - `/api/about`
   - `/api/comments?entityType=news&entityId=1`
   - `/api/contact` (POST)

3. Test authentication:
   - POST to `/api/register` with username/password
   - POST to `/api/login` with username/password
   - GET `/api/user` with Authorization header

4. Test admin endpoints (with valid authentication):
   - GET `/api/contact` (list contact submissions)
   - POST `/api/about` (create new about section)
   - PUT `/api/comments/1` (update comment)

## Troubleshooting

Common issues:

- **Database connection errors**: Verify your `DATABASE_URL` environment variable and ensure your database accepts connections from Netlify's IP range
- **Function timeout errors**: Netlify Functions have a 10-second timeout limit. Optimize slow database queries
- **CORS errors**: The functions already include CORS headers, but you may need to customize them for your specific domains