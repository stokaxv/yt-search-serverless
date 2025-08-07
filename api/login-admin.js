const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Mock encryption - replace with actual encryption later
function encryptPassword(password) {
  return password; // TODO: implement encryption
}

function decryptPassword(encryptedPassword) {
  return encryptedPassword; // TODO: implement decryption
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  try {
    const admin = await sql`SELECT id, password_hash, token_id FROM users WHERE role = 'admin' LIMIT 1`;
    
    const decryptedPassword = decryptPassword(password);
    if (!admin.rows.length || !await bcrypt.compare(decryptedPassword, admin.rows[0].password_hash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    let tokenId = admin.rows[0].token_id;
    if (!tokenId) {
      tokenId = uuidv4();
      await sql`UPDATE users SET token_id = ${tokenId} WHERE id = ${admin.rows[0].id}`;
    }

    res.status(200).json({ token_id: tokenId, role: 'admin' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};