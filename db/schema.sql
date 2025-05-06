-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: investment_groups
CREATE TABLE IF NOT EXISTS investment_groups (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: contact_messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  date TIMESTAMPTZ,  -- better to store as timestamp, not plain text
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: investments
CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  group_id TEXT NOT NULL REFERENCES investment_groups(slug) ON DELETE CASCADE,
  roi TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  position VARCHAR(100) NOT NULL,
  bio TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- News articles table
CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  published_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  author VARCHAR(100),
  source VARCHAR(100),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- About sections table
CREATE TABLE IF NOT EXISTS about_sections (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  page_id TEXT NOT NULL,  -- Keeps support for page-specific comments (e.g. "about", "news:12")
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_name TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);



-- Sample data (uncomment to populate database with sample data)

-- Create admin user (password: 'admin123')
INSERT INTO users (username, password, display_name, is_admin)
VALUES (
  'admin', 
  '$2b$10$DdBD5PQscCZUBs0TrK6rP.yY3NzNfmIBiW6S4KJQqI6FEXvR7fM.2', 
  'Administrator', 
  TRUE
) ON CONFLICT (username) DO NOTHING;

-- Create sample investment groups
INSERT INTO investment_groups (slug, title, description)
VALUES
  ('real-estate', 'Real Estate', 'Property investments including residential and commercial real estate'),
  ('technology', 'Technology', 'Investments in cutting-edge technology companies'),
  ('sustainable-energy', 'Sustainable Energy', 'Green energy and sustainability-focused investments')
ON CONFLICT (slug) DO NOTHING;


-- Create sample investments
INSERT INTO investments (title, description, roi,  group_id, image_url)
VALUES
  ('Downtown Office Complex', 'Premium office space in central business district', '8.50', 'real-estate', 'https://via.placeholder.com/300'),
  ('Residential Apartments', 'Multi-family housing development', '7.25', 'real-estate', 'https://via.placeholder.com/300'),
  ('AI Startup Fund', 'Investment in artificial intelligence startups', '12.75', 'technology', 'https://via.placeholder.com/300'),
  ('Quantum Computing Research', 'R&D funding for quantum computing', '15.00', 'technology', 'https://via.placeholder.com/300'),
  ('Solar Farm Project', 'Large-scale solar energy generation', '9.30', 'sustainable-energy', 'https://via.placeholder.com/300'),
  ('Wind Energy Development', 'Offshore wind turbine installation', '8.75', 'sustainable-energy', 'https://via.placeholder.com/300')
ON CONFLICT DO NOTHING;


-- Create sample team members
INSERT INTO team_members (name, position, bio, image_url)
VALUES
  ('John Doe', 'CEO', 'Founder and CEO with 15 years of experience', 'https://via.placeholder.com/150'),
  ('Jane Smith', 'CTO', 'Technology expert with a background in fintech', 'https://via.placeholder.com/150'),
  ('Bob Johnson', 'CFO', 'Financial wizard with experience in investment banking', 'https://via.placeholder.com/150')
ON CONFLICT DO NOTHING;

-- Create sample news articles
INSERT INTO news (title, content, image_url, published_date, author, source, is_featured)
VALUES
  ('New Investment Opportunity in Renewable Energy', 'Our company is proud to announce a new investment opportunity in renewable energy...', 'https://via.placeholder.com/300', '2025-04-25', 'Jane Smith', 'Investment Portal', TRUE),
  ('Market Analysis: Real Estate Trends 2025', 'The real estate market is showing promising signs of growth in the following sectors...', 'https://via.placeholder.com/300', '2025-04-22', 'John Doe', 'Investment Portal', FALSE),
  ('Tech Investments Yielding Record Returns', 'Our technology investment portfolio has outperformed market expectations with returns of...', 'https://via.placeholder.com/300', '2025-04-20', 'Bob Johnson', 'Investment Portal', FALSE)
ON CONFLICT DO NOTHING;

-- Create sample about sections
INSERT INTO about_sections (title, content, order_index, image_url)
VALUES
  ('Our Mission', 'To provide transparent and accessible investment opportunities for everyone...', 1, 'https://via.placeholder.com/300'),
  ('Our Values', 'Integrity, transparency, and client satisfaction are at the core of our business...', 2, 'https://via.placeholder.com/300'),
  ('Our History', 'Founded in 2020, our company has grown to become a leader in innovative investment solutions...', 3, 'https://via.placeholder.com/300')
ON CONFLICT DO NOTHING;