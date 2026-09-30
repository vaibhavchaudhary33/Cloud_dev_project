CREATE TABLE IF NOT EXISTS deployments (
  id         SERIAL PRIMARY KEY,
  repo_url   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'building',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
