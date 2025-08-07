const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'POST') {
    const { role, password, name } = req.body;
    
    if (!role || !password) {
      return res.status(400).json({ error: 'Role and password required' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const tokenId = uuidv4();
      
      const result = await sql`
        INSERT INTO users (role, password_hash, token_id, name)
        VALUES (${role}, ${passwordHash}, ${tokenId}, ${name})
        RETURNING id, role, token_id, name
      `;
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    try {
      const result = await sql`SELECT id, role, token_id, name FROM users`;
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};