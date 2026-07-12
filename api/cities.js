export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
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

    const listingsRes = await fetch('https://api.hostaway.com/v1/listings?limit=500', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!listingsRes.ok) throw new Error('Could not fetch listings');
    const data = await listingsRes.json();

    const cities = [...new Set((data.result || []).map((l) => l.city).filter(Boolean))];
    res.status(200).json({ cities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
