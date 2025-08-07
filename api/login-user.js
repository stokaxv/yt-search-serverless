const { sql } = require('@vercel/postgres');
const { v4: uuidv4 } = require('uuid');

// Mock encryption - replace with actual encryption later
function decryptCode(encryptedCode) {
  return encryptedCode; // TODO: implement decryption
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { registration_code } = req.body;
  
  if (!registration_code) {
    return res.status(400).json({ error: 'Registration code required' });
  }

  try {
    const decryptedCode = decryptCode(registration_code);
    const user = await sql`SELECT id, token_id FROM users WHERE registration_code = ${decryptedCode} AND role = 'client'`;
    
    if (!user.rows.length) {
      return res.status(401).json({ error: 'Invalid registration code' });
    }

    let tokenId = user.rows[0].token_id;
    if (!tokenId) {
      tokenId = uuidv4();
      await sql`UPDATE users SET token_id = ${tokenId} WHERE id = ${user.rows[0].id}`;
    }

    res.status(200).json({ token_id: tokenId, user_id: user.rows[0].id, role: 'client' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};