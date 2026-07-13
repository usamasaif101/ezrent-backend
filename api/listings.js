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
    const baseParams = { isBookingEngineActive: '1', includeResources: '1' };
    if (checkIn) baseParams.availabilityDateStart = checkIn;
    if (checkOut) baseParams.availabilityDateEnd = checkOut;
    if (guests) baseParams.availabilityGuestNumber = guests;
    if (location) baseParams.city = location;

    const batchSize = 100;
    let offset = 0;
    let allResults = [];

    while (true) {
      const hostawayParams = new URLSearchParams({ ...baseParams, limit: String(batchSize), offset: String(offset) });
      const listingsRes = await fetch(`https://api.hostaway.com/v1/listings?${hostawayParams}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!listingsRes.ok) throw new Error('Could not fetch listings');
      const data = await listingsRes.json();
      const batch = data.result || [];
      allResults = allResults.concat(batch);
      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    const simplified = allResults.map((l) => ({
      id: l.id,
      title: l.name,
      image: l.listingImages?.[0]?.url || null,
      images: (l.listingImages || []).map((img) => img.url),
      price: l.price,
      bedrooms: l.bedroomsNumber,
      beds: l.bedsNumber,
      bathrooms: l.bathroomsNumber,
      guests: l.personCapacity,
      city: l.city,
      amenities: (l.listingAmenities || []).map((a) => a.amenityName).filter(Boolean),
    }));

    res.status(200).json({ listings: simplified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
