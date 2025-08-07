const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, submission_id, vote_type } = req.body;
  
  if (!user_id || !submission_id || !vote_type) {
    return res.status(400).json({ error: 'user_id, submission_id, and vote_type required' });
  }

  if (!['like', 'dislike'].includes(vote_type)) {
    return res.status(400).json({ error: 'vote_type must be like or dislike' });
  }

  try {
    // Check existing vote
    const existingVote = await sql`
      SELECT vote_type FROM user_likes 
      WHERE user_id = ${user_id} AND submission_id = ${submission_id}
    `;

    if (existingVote.rows.length > 0) {
      const oldVote = existingVote.rows[0].vote_type;
      
      if (oldVote === vote_type) {
        // Remove vote
        await sql`DELETE FROM user_likes WHERE user_id = ${user_id} AND submission_id = ${submission_id}`;
        await sql`UPDATE submissions SET ${sql(oldVote === 'like' ? 'likes' : 'dislikes')} = ${sql(oldVote === 'like' ? 'likes' : 'dislikes')} - 1 WHERE submission_id = ${submission_id}`;
      } else {
        // Change vote
        await sql`UPDATE user_likes SET vote_type = ${vote_type} WHERE user_id = ${user_id} AND submission_id = ${submission_id}`;
        await sql`UPDATE submissions SET ${sql(oldVote === 'like' ? 'likes' : 'dislikes')} = ${sql(oldVote === 'like' ? 'likes' : 'dislikes')} - 1, ${sql(vote_type === 'like' ? 'likes' : 'dislikes')} = ${sql(vote_type === 'like' ? 'likes' : 'dislikes')} + 1 WHERE submission_id = ${submission_id}`;
      }
    } else {
      // New vote
      await sql`INSERT INTO user_likes (user_id, submission_id, vote_type) VALUES (${user_id}, ${submission_id}, ${vote_type})`;
      await sql`UPDATE submissions SET ${sql(vote_type === 'like' ? 'likes' : 'dislikes')} = ${sql(vote_type === 'like' ? 'likes' : 'dislikes')} + 1 WHERE submission_id = ${submission_id}`;
    }

    const result = await sql`SELECT * FROM submissions WHERE submission_id = ${submission_id}`;
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};