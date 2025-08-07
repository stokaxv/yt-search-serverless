const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Mock encryption - replace with actual encryption later
function encryptCode(code) {
  return code; // TODO: implement encryption
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token_id, count } = req.body;
  
  if (!token_id || !count) {
    return res.status(400).json({ error: 'token_id and count required' });
  }

  try {
    const admin = await sql`SELECT id FROM users WHERE token_id = ${token_id} AND role = 'admin' LIMIT 1`;
    if (!admin.rows.length) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = generateCode();
      const encryptedCode = encryptCode(code);
      await sql`INSERT INTO users (role, password_hash, registration_code) VALUES ('client', '', ${encryptedCode})`;
      codes.push(code);
    }

    res.status(200).json({ codes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};