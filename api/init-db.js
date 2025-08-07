const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role VARCHAR(10) CHECK (role IN ('admin', 'client')) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        registration_code VARCHAR(6) UNIQUE,
        token_id VARCHAR(36) UNIQUE,
        submission_id VARCHAR(36),
        name VARCHAR(255)
      )
    `;

    await sql`
      INSERT INTO users (role, password_hash, registration_code) 
      VALUES ('admin', '$2a$10$defaultadminhash', NULL)
      ON CONFLICT DO NOTHING
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        submission_id VARCHAR(36) PRIMARY KEY,
        validation_status VARCHAR(10) CHECK (validation_status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        song_id VARCHAR(50) NOT NULL,
        title VARCHAR(500),
        thumbnail VARCHAR(500),
        author VARCHAR(255),
        duration INTEGER,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0
      )
    `;

    await sql`
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0
    `;

    await sql`
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS title VARCHAR(500)
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_likes (
        user_id INTEGER REFERENCES users(id),
        submission_id VARCHAR(36) REFERENCES submissions(submission_id),
        vote_type VARCHAR(10) CHECK (vote_type IN ('like', 'dislike')),
        PRIMARY KEY (user_id, submission_id)
      )
    `;

    res.status(200).json({ message: 'Database initialized' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};