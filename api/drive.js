async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  return data.access_token;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.body || req.query;

  try {
    const token = await getAccessToken();

    if (action === 'create_folder') {
      const { name, parent_id } = req.body;
      const r = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parent_id ? [parent_id] : [],
        }),
      });
      const folder = await r.json();
      return res.status(200).json({ folder_id: folder.id });
    }

    if (action === 'list_files') {
      const { folder_id } = req.query;
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folder_id}'+in+parents&fields=files(id,name,thumbnailLink,webViewLink,size)`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await r.json();
      return res.status(200).json({ files: data.files || [] });
    }

    if (action === 'get_link') {
      const { file_id } = req.query;
      await fetch(`https://www.googleapis.com/drive/v3/files/${file_id}/permissions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      });
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file_id}?fields=webViewLink,thumbnailLink`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const file = await r.json();
      return res.status(200).json({ view_link: file.webViewLink, thumb: file.thumbnailLink });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
