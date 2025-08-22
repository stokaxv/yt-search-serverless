const { sql } = require('@vercel/postgres');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function getKeyPair() {
  const privateKey = process.env.PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wQNprGRi0nmFHPjjSifvs9fcyE7T/IXj3i7XF4UrNMfFvHDagjgEqiAIuF2ND+fq
vQDNvBSrw5LOmRJNighCb/BWC76goN4fQy6e74UwcjLXHlDXkxNnXNiRxBxt/lnP
vUFq+jbqVVWmIlSPzjNzN0=
-----END PRIVATE KEY-----`;

  return { privateKey };
}

function decrypt(encryptedData) {
  try {
    const { privateKey } = getKeyPair();
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = crypto.privateDecrypt(privateKey, buffer);
    return decrypted.toString('utf8');
  } catch (error) {
    return Buffer.from(encryptedData, 'base64').toString('utf8');
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, role } = req.query;
  
  if (!q || !role) {
    return res.status(400).json({ error: 'Encrypted data and role required' });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or user' });
  }

  try {
    const decryptedData = decrypt(q);

    if (role === 'admin') {
      const admin = await sql`SELECT id, password_hash, token_id FROM users WHERE role = 'admin' LIMIT 1`;
      
      if (!admin.rows.length || !await bcrypt.compare(decryptedData, admin.rows[0].password_hash)) {
        return res.status(401).json({ success: false, message: 'Invalid admin password' });
      }

      let sessionToken = admin.rows[0].token_id;
      if (!sessionToken) {
        sessionToken = uuidv4();
        await sql`UPDATE users SET token_id = ${sessionToken} WHERE id = ${admin.rows[0].id}`;
      }

      res.status(200).json({ 
        success: true, 
        sessionToken,
        message: 'Admin verified successfully'
      });
    } else {
      const user = await sql`SELECT id, token_id FROM users WHERE registration_code = ${decryptedData} AND role = 'client'`;
      
      if (!user.rows.length) {
        return res.status(401).json({ success: false, message: 'Invalid registration code' });
      }

      let sessionToken = user.rows[0].token_id;
      if (!sessionToken) {
        sessionToken = uuidv4();
        await sql`UPDATE users SET token_id = ${sessionToken} WHERE id = ${user.rows[0].id}`;
      }

      res.status(200).json({ 
        success: true, 
        sessionToken,
        message: 'User verified successfully'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};