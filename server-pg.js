const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { Pool } = require("pg");

// JWT Secret for token signing (replace with a more secure secret in production)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Load environment variables from .env file if not in production
if (process.env.NODE_ENV !== "production") {
  console.log("Loading environment variables from .env file");
  require("dotenv").config();
}

// Create a connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Needed for connecting to some PostgreSQL providers
  },
});

// Database query helper functions
const db = {
  query: (text, params = []) => pool.query(text, params),
};

// Middleware
const allowedOrigin = process.env.CORS_ORIGIN || "https://classy-maamoul-7230bb.netlify.app";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || "session-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy for authentication
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE username = $1",
          [username]
        );
        const user = result.rows[0];

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = result.rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Authentication middleware for protected routes
function isAuthenticated(req, res, next) {
  // Check for session-based authentication
  if (req.isAuthenticated()) {
    return next();
  }

  // Check for token-based authentication
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Admin check middleware
function isAdmin(req, res, next) {
  if (req.user && (req.user.isAdmin || req.user.is_admin)) {
    return next();
  }

  return res.status(403).json({ error: "Admin access required" });
}

// Auth endpoints
app.post("/api/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: info.message });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Create a JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          isAdmin: user.is_admin,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          isAdmin: user.is_admin,
        },
        token,
      });
    });
  })(req, res, next);
});

app.post("/api/register", async (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Check if username is already taken
    const existingUser = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const result = await db.query(
      "INSERT INTO users (username, password, display_name, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, is_admin",
      [username, hashedPassword, displayName || username, false]
    );

    const newUser = result.rows[0];

    // Create a JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        isAdmin: newUser.is_admin,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        isAdmin: newUser.is_admin,
      },
      token,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logout successful" });
  });
});

app.get("/api/user", isAuthenticated, (req, res) => {
  // User information is already in req.user
  res.json({
    id: req.user.id,
    username: req.user.username,
    displayName: req.user.displayName || req.user.display_name,
    isAdmin: req.user.isAdmin || req.user.is_admin,
  });
});

// Team API endpoints
app.get("/api/team", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, position, bio, image_url as "imageUrl",
             created_at as "createdAt"
      FROM team_members
      ORDER BY created_at DESC
    `);

    res.json({ data: result.rows });
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/team/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT id, name, position, bio, image_url as "imageUrl",
             created_at as "createdAt"
      FROM team_members
      WHERE id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Team member not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching team member:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/team", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, position, bio, imageUrl } = req.body;

    if (!name || !position) {
      return res.status(400).json({ error: "Name and position are required" });
    }

    const now = new Date().toISOString();

    const result = await db.query(
      `
      INSERT INTO team_members (name, position, bio, image_url, created_at) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, position, bio, image_url as "imageUrl", created_at as "createdAt"
    `,
      [name, position, bio || null, imageUrl || null, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating team member:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/team/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, bio, imageUrl } = req.body;

    if (!name || !position) {
      return res.status(400).json({ error: "Name and position are required" });
    }

    const result = await db.query(
      `
      UPDATE team_members 
      SET name = $1, position = $2, bio = $3, image_url = $4
      WHERE id = $5
      RETURNING id, name, position, bio, image_url as "imageUrl", created_at as "createdAt"
    `,
      [name, position, bio || null, imageUrl || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Team member not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating team member:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/team/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM team_members WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Team member not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting team member:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// News API Endpoints
app.get("/api/news", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, title, content, image_url as "imageUrl", published_date as "publishedDate", 
             author, source, is_featured as "isFeatured", created_at as "createdAt", updated_at as "updatedAt" 
      FROM news
      ORDER BY published_date DESC
    `);

    res.json({ data: result.rows });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/news/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT id, title, content, image_url as "imageUrl", published_date as "publishedDate", 
             author, source, is_featured as "isFeatured", created_at as "createdAt", updated_at as "updatedAt" 
      FROM news
      WHERE id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "News article not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching news article:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/news", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      imageUrl,
      publishedDate,
      author,
      source,
      isFeatured,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const now = new Date().toISOString();

    const result = await db.query(
      `
      INSERT INTO news (title, content, image_url, published_date, author, source, is_featured, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title, content, image_url as "imageUrl", published_date as "publishedDate", 
                author, source, is_featured as "isFeatured", created_at as "createdAt", updated_at as "updatedAt"
    `,
      [
        title,
        content,
        imageUrl || null,
        publishedDate || now,
        author || null,
        source || null,
        isFeatured || false,
        now,
        now,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating news article:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/news/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      imageUrl,
      publishedDate,
      author,
      source,
      isFeatured,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const now = new Date().toISOString();

    const result = await db.query(
      `
      UPDATE news 
      SET title = $1, content = $2, image_url = $3, published_date = $4, author = $5, 
          source = $6, is_featured = $7, updated_at = $8
      WHERE id = $9
      RETURNING id, title, content, image_url as "imageUrl", published_date as "publishedDate", 
                author, source, is_featured as "isFeatured", created_at as "createdAt", updated_at as "updatedAt"
    `,
      [
        title,
        content,
        imageUrl || null,
        publishedDate || null,
        author || null,
        source || null,
        isFeatured || false,
        now,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "News article not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating news article:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/news/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM news WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "News article not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting news article:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// About Sections API
app.get("/api/about", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, title, content, order_index as "orderIndex", image_url as "imageUrl", 
             created_at as "createdAt"
      FROM about_sections
      ORDER BY order_index ASC
    `);

    res.json({ data: result.rows });
  } catch (error) {
    console.error("Error fetching about sections:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/about/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT id, title, content, order_index as "orderIndex", image_url as "imageUrl", 
             created_at as "createdAt"
      FROM about_sections
      WHERE id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "About section not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching about section:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/about", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, content, orderIndex, imageUrl } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const now = new Date().toISOString();

    // Get the maximum order index if not provided
    let index = orderIndex;
    if (index === undefined) {
      const maxResult = await db.query(
        "SELECT MAX(order_index) as max FROM about_sections"
      );
      index = maxResult.rows[0].max ? maxResult.rows[0].max + 1 : 0;
    }

    const result = await db.query(
      `
      INSERT INTO about_sections (title, content, order_index, image_url, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, content, order_index as "orderIndex", image_url as "imageUrl", 
                created_at as "createdAt"
    `,
      [title, content, index, imageUrl || null, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating about section:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/about/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, orderIndex, imageUrl } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const result = await db.query(
      `
      UPDATE about_sections
      SET title = $1, content = $2, order_index = $3, image_url = $4
      WHERE id = $5
      RETURNING id, title, content, order_index as "orderIndex", image_url as "imageUrl", 
                created_at as "createdAt"
    `,
      [title, content, orderIndex, imageUrl || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "About section not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating about section:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/about/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM about_sections WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "About section not found" });
    }

    // Re-order remaining sections to maintain continuous ordering
    await db.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY order_index ASC) - 1 as new_index
        FROM about_sections
      )
      UPDATE about_sections
      SET order_index = ranked.new_index
      FROM ranked
      WHERE about_sections.id = ranked.id
    `);

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting about section:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Contact Messages API
app.get("/api/contact", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, subject, message, date, is_read as "isRead", created_at as "createdAt"
      FROM contact_messages
      ORDER BY created_at DESC
    `);
    res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch contact messages" });
  }
});

app.get("/api/contact/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT id, name, email, subject, message, date, is_read as "isRead", created_at as "createdAt"
      FROM contact_messages
      WHERE id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch contact message" });
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message, date } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ error: "Name, email, and message are required" });
    }

    const result = await db.query(
      `
      INSERT INTO contact_messages (name, email, subject, message, date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [name, email, subject, message, date || new Date().toISOString()]
    );

    res.status(201).json({
      id: result.rows[0].id,
      message: "Contact message sent successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send contact message" });
  }
});

app.put("/api/contact/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    if (isRead === undefined) {
      return res.status(400).json({ error: "isRead field is required" });
    }

    const result = await db.query(
      `
      UPDATE contact_messages
      SET is_read = $1
      WHERE id = $2
      RETURNING id, name, email, subject, message, date, is_read as "isRead", created_at as "createdAt"
    `,
      [isRead ? 1 : 0, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update contact message" });
  }
});

app.delete("/api/contact/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM contact_messages
      WHERE id = $1
      RETURNING id
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete contact message" });
  }
});

// Comments API
app.get("/api/comments", async (req, res) => {
  try {
    const { pageId } = req.query;

    let query = `
      SELECT c.id, c.content, c.page_id as "pageId", c.parent_id as "parentId", 
             c.user_id as "userId", c.guest_name as "guestName",
             c.created_at as "createdAt", c.updated_at as "updatedAt",
             u.display_name as "userDisplayName"
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
    `;

    const params = [];
    if (pageId) {
      query += " WHERE c.page_id = $1";
      params.push(pageId);
    }

    query += " ORDER BY c.created_at DESC";

    const result = await db.query(query, params);

    res.json({ data: result.rows });
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.post("/api/comments", async (req, res) => {
  try {
    const { content, pageId, parentId, guestName } = req.body;

    if (!content || !pageId) {
      return res.status(400).json({ error: "Content and pageId are required" });
    }

    // If user is authenticated, use their ID, otherwise use guest name
    const userId = req.isAuthenticated() ? req.user.id : null;

    if (!userId && !guestName) {
      return res
        .status(400)
        .json({ error: "Guest name is required for anonymous comments" });
    }

    const now = new Date().toISOString();

    const result = await db.query(
      `
      INSERT INTO comments (content, page_id, parent_id, user_id, guest_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, content, page_id as "pageId", parent_id as "parentId", 
                user_id as "userId", guest_name as "guestName",
                created_at as "createdAt", updated_at as "updatedAt"
    `,
      [content, pageId, parentId || null, userId, guestName, now, now]
    );

    // Get the user display name if a user is associated
    let userDisplayName = null;
    if (userId) {
      const userResult = await db.query(
        "SELECT display_name FROM users WHERE id = $1",
        [userId]
      );
      if (userResult.rows.length > 0) {
        userDisplayName = userResult.rows[0].display_name;
      }
    }

    const comment = result.rows[0];
    comment.userDisplayName = userDisplayName;

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

app.put("/api/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    // Verify the user owns this comment or is admin
    const comment = await db.query(
      "SELECT user_id FROM comments WHERE id = $1",
      [id]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const isOwner =
      req.isAuthenticated() && comment.rows[0].user_id === req.user.id;
    const isUserAdmin =
      req.isAuthenticated() && (req.user.isAdmin || req.user.is_admin);

    if (!isOwner && !isUserAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this comment" });
    }

    const now = new Date().toISOString();

    const result = await db.query(
      `
      UPDATE comments
      SET content = $1, updated_at = $2
      WHERE id = $3
      RETURNING id, content, page_id as "pageId", parent_id as "parentId", 
                user_id as "userId", guest_name as "guestName",
                created_at as "createdAt", updated_at as "updatedAt"
    `,
      [content, now, id]
    );

    // Get the user display name if a user is associated
    let userDisplayName = null;
    if (result.rows[0].userId) {
      const userResult = await db.query(
        "SELECT display_name FROM users WHERE id = $1",
        [result.rows[0].userId]
      );
      if (userResult.rows.length > 0) {
        userDisplayName = userResult.rows[0].display_name;
      }
    }

    const updatedComment = result.rows[0];
    updatedComment.userDisplayName = userDisplayName;

    res.json(updatedComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

app.delete("/api/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the user owns this comment or is admin
    const comment = await db.query(
      "SELECT user_id FROM comments WHERE id = $1",
      [id]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const isOwner =
      req.isAuthenticated() && comment.rows[0].user_id === req.user.id;
    const isUserAdmin =
      req.isAuthenticated() && (req.user.isAdmin || req.user.is_admin);

    if (!isOwner && !isUserAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment" });
    }

    // Delete this comment and any replies
    await db.query("DELETE FROM comments WHERE id = $1 OR parent_id = $1", [
      id,
    ]);

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// Investment Groups API
app.get("/api/investment-groups", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, title, description, slug, created_at as "createdAt"
      FROM investment_groups
      ORDER BY title ASC
    `);

    res.json({ data: result.rows });
  } catch (error) {
    console.error("Error fetching investment groups:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/investment-groups/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Allow lookup by id or slug
    let query, params;
    if (isNaN(id)) {
      query = `
        SELECT id, title, description, slug, created_at as "createdAt"
        FROM investment_groups
        WHERE slug = $1
      `;
      params = [id];
    } else {
      query = `
        SELECT id, title, description, slug, created_at as "createdAt"
        FROM investment_groups
        WHERE id = $1
      `;
      params = [id];
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Investment group not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching investment group:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post(
  "/api/investment-groups",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { title, description, slug } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      // Generate slug if not provided
      let finalSlug = slug;
      if (!finalSlug) {
        finalSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }

      // Check if slug already exists
      const slugCheck = await db.query(
        "SELECT id FROM investment_groups WHERE slug = $1",
        [finalSlug]
      );
      if (slugCheck.rows.length > 0) {
        return res.status(400).json({ error: "Slug already exists" });
      }

      const now = new Date().toISOString();

      const result = await db.query(
        `
      INSERT INTO investment_groups (title, description, slug, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, description, slug, created_at as "createdAt"
    `,
        [title, description || null, finalSlug, now]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating investment group:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

app.put(
  "/api/investment-groups/:id",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, slug } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      // Check if the group exists
      const groupCheck = await db.query(
        "SELECT * FROM investment_groups WHERE id = $1",
        [id]
      );
      if (groupCheck.rows.length === 0) {
        return res.status(404).json({ error: "Investment group not found" });
      }

      // Check if new slug already exists for a different group
      if (slug && slug !== groupCheck.rows[0].slug) {
        const slugCheck = await db.query(
          "SELECT id FROM investment_groups WHERE slug = $1 AND id != $2",
          [slug, id]
        );
        if (slugCheck.rows.length > 0) {
          return res.status(400).json({ error: "Slug already exists" });
        }
      }

      const result = await db.query(
        `
      UPDATE investment_groups
      SET title = $1, description = $2, slug = $3
      WHERE id = $4
      RETURNING id, title, description, slug, created_at as "createdAt"
    `,
        [title, description || null, slug || groupCheck.rows[0].slug, id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating investment group:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

app.delete(
  "/api/investment-groups/:id",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if there are investments in this group
      const investmentsCheck = await db.query(
        "SELECT COUNT(*) FROM investments WHERE group_id = $1",
        [id]
      );

      if (parseInt(investmentsCheck.rows[0].count) > 0) {
        return res
          .status(400)
          .json({ error: "Cannot delete group with active investments" });
      }

      const result = await db.query(
        "DELETE FROM investment_groups WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Investment group not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting investment group:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Investments API
app.get("/api/investments", async (req, res) => {
  try {
    // Get group_id filter if present
    const { group } = req.query;

    let query = `
      SELECT i.id, i.title, i.description, i.roi, i.image_url as "imageUrl", i.group_id as "groupId",
             i.created_at as "createdAt",
             g.title as "groupTitle", g.slug as "groupSlug"
      FROM investments i
      JOIN investment_groups g ON i.group_id = g.slug
    `;

    const params = [];
    if (group) {
      // Use the slug to filter by group
      query += " WHERE g.slug = $1";
      params.push(group);
    }

    query += " ORDER BY i.created_at DESC";

    const result = await db.query(query, params);

    res.json({ data: result.rows });
  } catch (error) {
    console.error("Error fetching investments:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/investments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT i.id, i.title, i.description, i.roi, i.image_url as "imageUrl", i.group_id as "groupId",
             i.created_at as "createdAt",
             g.title as "groupTitle", g.slug as "groupSlug"
      FROM investments i
      JOIN investment_groups g ON i.group_id = g.slug
      WHERE i.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Investment not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching investment:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/investments", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, description, roi, imageUrl, groupSlug } = req.body;

    if (!title || !groupSlug) {
      return res
        .status(400)
        .json({ error: "Title and groupSlug are required" });
    }

    // Check if the group exists
    const groupCheck = await db.query(
      "SELECT * FROM investment_groups WHERE slug = $1",
      [groupSlug]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Investment group not found" });
    }

    const now = new Date().toISOString();

    const result = await db.query(
      `
      INSERT INTO investments (title, description, roi, image_url, group_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, description, roi, image_url as "imageUrl", group_id as "groupId",
                created_at as "createdAt"
    `,
      [
        title,
        description || null,
        roi || null,
        imageUrl || null,
        groupSlug,
        now,
      ]
    );

    // Get additional data for response
    const investment = result.rows[0];
    const additionalData = await db.query(
      `
      SELECT g.title as "groupTitle", g.slug as "groupSlug"
      FROM investment_groups g
      WHERE g.slug = $1
    `,
      [groupSlug]
    );

    if (additionalData.rows.length > 0) {
      investment.groupTitle = additionalData.rows[0].groupTitle;
      investment.groupSlug = additionalData.rows[0].groupSlug;
    }

    res.status(201).json(investment);
  } catch (error) {
    console.error("Error creating investment:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/investments/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, roi, imageUrl, groupSlug } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Check if investment exists
    const checkResult = await db.query(
      "SELECT * FROM investments WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Investment not found" });
    }

    // Check if group exists if groupSlug provided
    if (groupSlug) {
      const groupCheck = await db.query(
        "SELECT * FROM investment_groups WHERE slug = $1",
        [groupSlug]
      );

      if (groupCheck.rows.length === 0) {
        return res.status(404).json({ error: "Investment group not found" });
      }
    }

    const result = await db.query(
      `
      UPDATE investments
      SET title = $1, 
          description = $2, 
          roi = $3, 
          image_url = $4,
          group_id = $5
      WHERE id = $6
      RETURNING id, title, description, roi, image_url as "imageUrl", group_id as "groupId",
                created_at as "createdAt"
    `,
      [
        title,
        description || null,
        roi || null,
        imageUrl || null,
        groupSlug || checkResult.rows[0].group_id,
        id,
      ]
    );

    // Get group info for response
    const investment = result.rows[0];
    const additionalData = await db.query(
      `
      SELECT g.title as "groupTitle", g.slug as "groupSlug"
      FROM investment_groups g
      WHERE g.slug = $1
    `,
      [investment.groupId]
    );

    if (additionalData.rows.length > 0) {
      investment.groupTitle = additionalData.rows[0].groupTitle;
      investment.groupSlug = additionalData.rows[0].groupSlug;
    }

    res.json(investment);
  } catch (error) {
    console.error("Error updating investment:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete(
  "/api/investments/:id",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        "DELETE FROM investments WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Investment not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting investment:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Fallback route for anything not explicitly defined
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "API endpoint not found" });
  } else {
    res.status(404).send("Not found");
  }
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
});
