const crypto = require('crypto');

// Generate or retrieve RSA key pair
function getKeyPair() {
  // In production, store these keys securely (environment variables, key management service)
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { publicKey } = getKeyPair();
    res.status(200).json({ publicKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};