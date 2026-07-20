export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { id, startDate, endDate } = req.query;
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

    const today = new Date();
    const defaultStart = startDate || today.toISOString().slice(0, 10);
    const defaultEndDate = new Date(today);
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 6);
    const defaultEnd = endDate || defaultEndDate.toISOString().slice(0, 10);

    const calendarRes = await fetch(
      `https://api.hostaway.com/v1/listings/${id}/calendar?startDate=${defaultStart}&endDate=${defaultEnd}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!calendarRes.ok) throw new Error('Could not fetch calendar');
    const data = await calendarRes.json();

    const days = (data.result || []).map((d) => ({
      date: d.date,
      isAvailable: d.isAvailable === 1 || d.status === 'available',
      price: d.price,
    }));

    res.status(200).json({ days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
