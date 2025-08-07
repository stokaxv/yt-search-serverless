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

  const publicKey = process.env.PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCgcEDaaxk
YtJ5hRz440on77PX3MhO0/yF494u1xeFK7THxbxw2oI4BKogCLhdjQ/n6r0Azbw=
-----END PUBLIC KEY-----`;

  return { privateKey, publicKey };
}

function decryptPassword(encryptedPassword) {
  try {
    const { privateKey } = getKeyPair();
    const buffer = Buffer.from(encryptedPassword, 'base64');
    const decrypted = crypto.privateDecrypt(privateKey, buffer);
    return decrypted.toString('utf8');
  } catch (error) {
    // Fallback for development
    return Buffer.from(encryptedPassword, 'base64').toString('utf8');
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Encrypted password required' });
  }

  try {
    const decryptedPassword = decryptPassword(q);
    const admin = await sql`SELECT id, password_hash, token_id FROM users WHERE role = 'admin' LIMIT 1`;
    
    if (!admin.rows.length || !await bcrypt.compare(decryptedPassword, admin.rows[0].password_hash)) {
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};