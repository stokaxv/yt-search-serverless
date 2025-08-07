const { sql } = require('@vercel/postgres');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'POST') {
    const { session_id, song_id, title, thumbnail, author, duration } = req.body;
    
    if (!session_id || !song_id) {
      return res.status(400).json({ error: 'session_id and song_id required' });
    }

    try {
      // Check if user exists and get user_id
      const user = await sql`SELECT id FROM users WHERE token_id = ${session_id} AND role = 'client'`;
      if (!user.rows.length) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      const userId = user.rows[0].id;
      
      // Check if user already submitted
      const existingSubmission = await sql`SELECT submission_id FROM users WHERE id = ${userId} AND submission_id IS NOT NULL`;
      if (existingSubmission.rows.length > 0) {
        return res.status(400).json({ error: 'User already submitted a song' });
      }

      const submissionId = uuidv4();
      
      // Insert submission
      const result = await sql`
        INSERT INTO submissions (submission_id, song_id, title, thumbnail, author, duration, likes, dislikes)
        VALUES (${submissionId}, ${song_id}, ${title}, ${thumbnail}, ${author}, ${duration}, 0, 0)
        RETURNING *
      `;
      
      // Update user with submission_id
      await sql`UPDATE users SET submission_id = ${submissionId} WHERE id = ${userId}`;
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM submissions ORDER BY timestamp DESC`;
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    const { submission_id, validation_status } = req.body;
    
    try {
      const result = await sql`
        UPDATE submissions 
        SET validation_status = ${validation_status}
        WHERE submission_id = ${submission_id}
        RETURNING *
      `;
      
      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};