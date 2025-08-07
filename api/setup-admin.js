const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await sql`UPDATE users SET password_hash = ${passwordHash} WHERE role = 'admin'`;
    
    res.status(200).json({ message: 'Admin password set' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};