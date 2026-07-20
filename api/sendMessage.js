export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { conversationId, body } = req.body;
    if (!conversationId || !body) throw new Error('Missing conversationId or body');

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

    const sendRes = await fetch(`https://api.hostaway.com/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    });

    const responseText = await sendRes.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    if (!sendRes.ok) {
      return res.status(sendRes.status).json({
        error: 'Hostaway rejected the message',
        hostawayStatus: sendRes.status,
        hostawayResponse: responseData,
      });
    }

    res.status(200).json(responseData.result || responseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
