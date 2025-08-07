const YouTube = require('youtube-sr').default;  // Changed to CommonJS require

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  const q = req.query.q;
  if (!q) {
    res.status(400).json({ error: 'Missing query parameter `q`' });
    return;
  }

  try {
    const results = await YouTube.search(q, { limit: 50, type: 'video' });

    const songs = results
      .filter(video => {
        // Filter by duration (1min to 10min, typical for songs)
        const durationSec = video.duration / 1000;
        return durationSec >= 10 && durationSec <= 600;
      })
      .slice(0, 10)
      .map(video => ({
        title:     video.title,
        url:       video.url,
        author:    video.channel.name,
        videoId:   video.id,
        thumbnail: video.thumbnail.url,
        duration: video.duration/1000
      }));

    res.status(200).json(songs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};