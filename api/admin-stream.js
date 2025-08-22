const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { session_id } = req.query;
  
  if (!session_id) {
    res.write('data: {"error": "session_id required"}\n\n');
    return res.end();
  }

  try {
    // Verify admin session
    const admin = await sql`SELECT id FROM users WHERE token_id = ${session_id} AND role = 'admin'`;
    if (!admin.rows.length) {
      res.write('data: {"error": "Invalid admin session"}\n\n');
      return res.end();
    }

    let lastCheck = new Date();
    let lastSubmissions = new Map();
    
    const checkForUpdates = async () => {
      try {
        const allSubmissions = await sql`SELECT * FROM submissions ORDER BY timestamp DESC`;
        const currentSubmissions = new Map(allSubmissions.rows.map(s => [s.submission_id, s]));
        
        const changes = [];
        
        // Check for new submissions
        for (const [id, submission] of currentSubmissions) {
          if (!lastSubmissions.has(id)) {
            changes.push({ type: 'new', submission });
          } else {
            const old = lastSubmissions.get(id);
            // Check for updates (likes, dislikes, validation_status)
            if (old.likes !== submission.likes || old.dislikes !== submission.dislikes || old.validation_status !== submission.validation_status) {
              changes.push({ type: 'updated', submission, old });
            }
          }
        }
        
        if (changes.length > 0) {
          res.write(`data: ${JSON.stringify({ type: 'changes', changes })}\n\n`);
        }
        
        lastSubmissions = currentSubmissions;
        res.write('data: {"type": "heartbeat"}\n\n');
      } catch (error) {
        res.write(`data: {"error": "${error.message}"}\n\n`);
      }
    };

    const interval = setInterval(checkForUpdates, 5000);
    
    req.on('close', () => {
      clearInterval(interval);
    });

  } catch (error) {
    res.write(`data: {"error": "${error.message}"}\n\n`);
    res.end();
  }
};