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

    const { checkIn, checkOut, guests, location } = req.query;
    const hostawayParams = new URLSearchParams({ limit: '100', isBookingEngineActive: '1' });
    if (checkIn) hostawayParams.set('availabilityDateStart', checkIn);
    if (checkOut) hostawayParams.set('availabilityDateEnd', checkOut);
    if (guests) hostawayParams.set('availabilityGuestNumber', guests);
    if (location) hostawayParams.set('city', location);

    const listingsRes = await fetch(`https://api.hostaway.com/v1/listings?${hostawayParams}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!listingsRes.ok) throw new Error('Could not fetch listings');
    const data = await listingsRes.json();

    const simplified = (data.result || [])
    .filter((l) => l.isBookingEngineActive)
    .map((l) => ({
      id: l.id,
      title: l.name,
      image: l.listingImages?.[0]?.url || null,
      price: l.price,
    }));

    res.status(200).json({ listings: simplified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
