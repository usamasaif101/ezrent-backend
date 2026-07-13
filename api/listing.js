export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { id } = req.query;
    if (!id) throw new Error('Missing listing id');

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

    const activeCheckRes = await fetch('https://api.hostaway.com/v1/listings?isBookingEngineActive=1&limit=500', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const activeData = activeCheckRes.ok ? await activeCheckRes.json() : null;

    res.status(200).json({
      debug: {
        activeCheckOk: activeCheckRes.ok,
        activeCheckStatus: activeCheckRes.status,
        totalActiveListings: activeData?.result?.length ?? null,
        idsReturned: activeData?.result?.map((item) => item.id) ?? null,
        isThisIdInList: activeData?.result?.some((item) => String(item.id) === String(id)) ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
