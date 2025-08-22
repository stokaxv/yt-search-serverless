const { sql } = require('@vercel/postgres');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    const { submission_id } = req.query;
    
    try {
      if (submission_id) {
        const result = await sql`SELECT * FROM submissions WHERE submission_id = ${submission_id}`;
        if (!result.rows.length) {
          return res.status(404).json({ error: 'Submission not found' });
        }
        res.status(200).json(result.rows[0]);
      } else {
        const result = await sql`SELECT * FROM submissions ORDER BY timestamp DESC`;
        res.status(200).json(result.rows);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id, action, submission_id, song_id, title, thumbnail, author, duration, user_name } = req.body;
  
  if (!session_id || !action) {
    return res.status(400).json({ error: 'session_id and action required' });
  }

  if (!['approve', 'deny', 'submit', 'like', 'dislike'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    // Get user info
    const user = await sql`SELECT id, role FROM users WHERE token_id = ${session_id}`;
    if (!user.rows.length) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const userId = user.rows[0].id;
    const userRole = user.rows[0].role;

    // Admin actions
    if (['approve', 'deny'].includes(action)) {
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      if (!submission_id) {
        return res.status(400).json({ error: 'submission_id required for admin actions' });
      }

      const validation_status = action === 'approve' ? 'approved' : 'denied';
      const result = await sql`
        UPDATE submissions 
        SET validation_status = ${validation_status}
        WHERE submission_id = ${submission_id}
        RETURNING *
      `;
      
      return res.status(200).json(result.rows[0]);
    }

    // User actions
    if (userRole !== 'client') {
      return res.status(403).json({ error: 'User access required' });
    }

    if (action === 'submit') {
      if (!song_id) {
        return res.status(400).json({ error: 'song_id required for submit action' });
      }

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
      
      // Update user with submission_id and name
      await sql`UPDATE users SET submission_id = ${submissionId}, name = ${user_name} WHERE id = ${userId}`;
      
      return res.status(201).json(result.rows[0]);
    }

    // Like/Dislike actions
    if (['like', 'dislike'].includes(action)) {
      if (!submission_id) {
        return res.status(400).json({ error: 'submission_id required for like/dislike actions' });
      }

      // Check existing vote
      const existingVote = await sql`
        SELECT vote_type FROM user_likes 
        WHERE user_id = ${userId} AND submission_id = ${submission_id}
      `;

      if (existingVote.rows.length > 0) {
        const oldVote = existingVote.rows[0].vote_type;
        
        if (oldVote === action) {
          // Remove vote
          await sql`DELETE FROM user_likes WHERE user_id = ${userId} AND submission_id = ${submission_id}`;
          await sql`UPDATE submissions SET ${sql(oldVote === 'like' ? 'likes' : 'dislikes')} = ${sql(oldVote === 'like' ? 'likes' : 'dislikes')} - 1 WHERE submission_id = ${submission_id}`;
        } else {
          // Change vote
          await sql`UPDATE user_likes SET vote_type = ${action} WHERE user_id = ${userId} AND submission_id = ${submission_id}`;
          await sql`UPDATE submissions SET ${sql(oldVote === 'like' ? 'likes' : 'dislikes')} = ${sql(oldVote === 'like' ? 'likes' : 'dislikes')} - 1, ${sql(action === 'like' ? 'likes' : 'dislikes')} = ${sql(action === 'like' ? 'likes' : 'dislikes')} + 1 WHERE submission_id = ${submission_id}`;
        }
      } else {
        // New vote
        await sql`INSERT INTO user_likes (user_id, submission_id, vote_type) VALUES (${userId}, ${submission_id}, ${action})`;
        await sql`UPDATE submissions SET ${sql(action === 'like' ? 'likes' : 'dislikes')} = ${sql(action === 'like' ? 'likes' : 'dislikes')} + 1 WHERE submission_id = ${submission_id}`;
      }

      const result = await sql`SELECT * FROM submissions WHERE submission_id = ${submission_id}`;
      return res.status(200).json(result.rows[0]);
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};