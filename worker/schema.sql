-- Auth users (same pattern as vault)
CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Comparison posts
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'pending',
  manga_key TEXT NOT NULL,
  anime_key TEXT NOT NULL,
  manga_crop TEXT NOT NULL DEFAULT '{"x":0,"y":0,"scale":1}',
  anime_crop TEXT NOT NULL DEFAULT '{"x":0,"y":0,"scale":1}',
  chapter TEXT,
  episode TEXT,
  tags TEXT DEFAULT '[]',
  submitter_id TEXT,
  submitter_name TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  approved_at TEXT
);

-- Votes (auth required)
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  value INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_approved ON posts(approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_post ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
