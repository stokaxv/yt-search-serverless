const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const users = await sql`SELECT * FROM users`;
    const submissions = await sql`SELECT * FROM submissions`;
    const userLikes = await sql`SELECT * FROM user_likes`;

    res.status(200).json({
      users: users.rows,
      submissions: submissions.rows,
      user_likes: userLikes.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};