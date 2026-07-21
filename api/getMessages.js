export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { conversationId } = req.query;
    if (!conversationId) throw new Error('Missing conversationId');

    const tokenRes = await fetch('https://api.hostaway.com/v1/accessTokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.HOSTAWAY_ACCOUNT_ID,
        client_secret: process.env.HOSTAWAY_API_KEY,
        scope: 'general',
      }),
    });
    if (!tokenRes.ok) throw new Error('Could not get access token');
    const { access_token } = await tokenRes.json();

    const messagesRes = await fetch(`https://api.hostaway.com/v1/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!messagesRes.ok) throw new Error('Could not fetch messages');
    const messagesData = await messagesRes.json();

    const messages = (messagesData.result || []).map((m) => ({
      id: m.id,
      body: m.body,
      isIncoming: m.isIncoming === 1,
      date: m.date,
    }));

    res.status(200).json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
