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

    const listingRes = await fetch(`https://api.hostaway.com/v1/listings/${id}?includeResources=1`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!listingRes.ok) throw new Error('Could not fetch listing');
    const data = await listingRes.json();
    const l = data.result;

    const amenityNames = (l.listingAmenities || []).map((a) => a.amenityName).filter(Boolean);

    res.status(200).json({
      id: l.id, title: l.name, description: l.description,
      images: (l.listingImages || []).map((img) => img.url),
      price: l.price, bedrooms: l.bedroomsNumber, bathrooms: l.bathroomsNumber,
      guests: l.personCapacity, city: l.city,
      amenities: amenityNames,
      lat: l.lat, lng: l.lng,
      checkInTimeStart: l.checkInTimeStart, checkOutTime: l.checkOutTime,
      maxPetsAllowed: l.maxPetsAllowed,
      cancellationPolicy: l.cancellationPolicy,
      minNights: l.minNights, maxNights: l.maxNights,
      instantBookable: l.instantBookable,
      houseRules: l.houseRules,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
