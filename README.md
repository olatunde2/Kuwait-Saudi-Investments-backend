# Serverless Investment Portal API

A serverless investment portal application leveraging modern web technologies to provide accessible and transparent investment management.

## Project Structure

```
.
├── functions/                    # Netlify serverless functions
│   ├── about.js                  # About section GET endpoint
│   ├── about-post.js             # About section POST endpoint
│   ├── about-put.js              # About section PUT endpoint
│   ├── about-delete.js           # About section DELETE endpoint
│   ├── api.js                    # API root endpoint
│   ├── auth.js                   # Authentication utilities
│   ├── comments.js               # Comments main router
│   ├── comments-get.js           # Comments GET endpoint
│   ├── comments-post.js          # Comments POST endpoint
│   ├── comments-put.js           # Comments PUT endpoint
│   ├── comments-delete.js        # Comments DELETE endpoint
│   ├── contact.js                # Contact form POST endpoint
│   ├── contact-get.js            # Contact form GET endpoint
│   ├── contact-delete.js         # Contact form DELETE endpoint
│   ├── database.js               # Database connection (PostgreSQL)
│   ├── investment-groups*.js     # Investment groups CRUD endpoints
│   ├── investments*.js           # Investments CRUD endpoints
│   ├── login.js                  # User login endpoint
│   ├── logout.js                 # User logout endpoint
│   ├── news*.js                  # News CRUD endpoints
│   ├── register.js               # User registration endpoint
│   ├── team*.js                  # Team members CRUD endpoints
│   ├── user.js                   # User profile endpoints
│   └── utils/                    # Utility functions
│       └── auth-middleware.js    # Authentication middleware
│
├── db/                        # Database configuration
│   ├── index.js               # Database connection
│   ├── init.js                # Database initialization
│   └── schema.sql             # Database schema
│
├── server-pg.js               # Express server for local development
└── netlify.toml               # Netlify configuration file
```

## Getting Started

### Prerequisites

- Node.js 16 or higher
- PostgreSQL database
- Netlify CLI (for serverless functions development)

### Setting Up

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   ```
   DATABASE_URL="postgresql://username:password@host:port/database"
   JWT_SECRET="your-secret-key"
   ```
4. Initialize the database:
   ```
   node db/init.js
   ```

### Running Locally

You can use two different methods to run the application locally:

1. Netlify Functions Server (Serverless):
   ```
   npx netlify-cli dev
   ```
   This will start a development server on port 8888 with clean URLs.

2. PostgreSQL API Server (Express):
   ```
   node server-pg.js
   ```
   This will start the Express server on port 5000.

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `GET /api/logout` - User logout
- `GET /api/user` - Get current user information

### Investments
- `GET /api/investments` - List all investments (filter by group with ?group=slug)
- `GET /api/investments/:id` - Get investment by ID
- `POST /api/investments` - Create new investment (requires admin)
- `PUT /api/investments/:id` - Update investment (requires admin)
- `DELETE /api/investments/:id` - Delete investment (requires admin)

### Investment Groups
- `GET /api/investment-groups` - List all investment groups
- `GET /api/investment-groups/:id` - Get investment group by ID
- `POST /api/investment-groups` - Create new investment group (requires admin)
- `PUT /api/investment-groups/:id` - Update investment group (requires admin)
- `DELETE /api/investment-groups/:id` - Delete investment group (requires admin)

### Team
- `GET /api/team` - List all team members
- `GET /api/team/:id` - Get team member by ID
- `POST /api/team` - Create new team member (requires admin)
- `PUT /api/team/:id` - Update team member (requires admin)
- `DELETE /api/team/:id` - Delete team member (requires admin)

### News
- `GET /api/news` - List all news articles
- `GET /api/news/:id` - Get news article by ID
- `POST /api/news` - Create news article (requires admin)
- `PUT /api/news/:id` - Update news article (requires admin)
- `DELETE /api/news/:id` - Delete news article (requires admin)

### About Page
- `GET /api/about` - Get all about page sections
- `GET /api/about/:id` - Get about section by ID
- `POST /api/about` - Create new about section (requires admin)
- `PUT /api/about/:id` - Update about section (requires admin)
- `DELETE /api/about/:id` - Delete about section (requires admin)

### Contact Form
- `POST /api/contact` - Submit contact form
- `GET /api/contact` - List all contact submissions (requires admin)
- `GET /api/contact/:id` - Get contact submission by ID (requires admin)
- `DELETE /api/contact/:id` - Delete contact submission (requires admin)

### Comments
- `GET /api/comments?entityType=&entityId=` - Get comments for specific entity
- `GET /api/comments/:id` - Get comment by ID
- `POST /api/comments` - Create new comment (guest or authenticated)
- `PUT /api/comments/:id` - Update comment (only owner or admin)
- `DELETE /api/comments/:id` - Delete comment (only owner or admin)

## Database Relationships

### Investments
- `group_id` in the investments table references `slug` in the investment_groups table (not id)
- This relationship allows for more readable URLs and better SEO

### Comments
- `user_id` in the comments table references `id` in the users table (optional)
- `parent_id` in the comments table references `id` in the same comments table for replies
- Comments support both authenticated users and guest comments with names

### About Sections
- About sections are stored with title, content, and order fields for flexible page building
- Admin users can create, update, and delete sections as needed

### Contact Form
- Contact submissions store name, email, subject, and message with timestamps
- Only accessible to administrators for management

## Authentication System

The application uses a hybrid authentication system:
1. JWT-based authentication for serverless functions
2. Session-based authentication for the Express server

### Default Admin User

The database initialization creates a default admin user:
- Username: `admin`
- Password: `admin123`

It's recommended to change the password immediately after logging in for the first time.

## Deployment

For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)#   K u w a i t - S a u d i - I n v e s t m e n t s - b a c k e n d  
 #   K u w a i t - S a u d i - I n v e s t m e n t s - b a c k e n d  
 #   K u w a i t - S a u d i - I n v e s t m e n t s - b a c k e n d  
 #   K u w a i t - S a u d i - I n v e s t m e n t s - b a c k e n d  
 #   K u w a i t - S a u d i - I n v e s t m e n t s - b a c k e n d  
 #   o l a t u n d e - K u w a i t - S a u d i - I n v e s t m e n t s - b a c k e n d  
 