export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { listingId, email } = req.query;
    if (!listingId || !email) throw new Error('Missing listingId or email');

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

    const resParams = new URLSearchParams({ listingMapId: listingId, guestEmail: email, limit: '5' });
    const reservationsRes = await fetch(`https://api.hostaway.com/v1/reservations?${resParams}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!reservationsRes.ok) throw new Error('Could not search reservations');
    const reservationsData = await reservationsRes.json();
    const reservation = (reservationsData.result || [])[0];

    if (!reservation) {
      return res.status(200).json({ found: false });
    }

    const convListRes = await fetch(`https://api.hostaway.com/v1/conversations?reservationId=${reservation.id}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!convListRes.ok) throw new Error('Could not fetch conversation');
    const convListData = await convListRes.json();
    const conversationSummary = (convListData.result || [])[0];

    if (!conversationSummary) {
      return res.status(200).json({ found: false, reservationId: reservation.id });
    }

    const messagesRes = await fetch(`https://api.hostaway.com/v1/conversations/${conversationSummary.id}/messages`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!messagesRes.ok) throw new Error('Could not fetch messages');
    const messagesData = await messagesRes.json();

    res.status(200).json({
      found: true,
      reservationId: reservation.id,
      conversationId: conversationSummary.id,
      messages: (messagesData.result || []).map((m) => ({
        id: m.id,
        body: m.body,
        isIncoming: m.isIncoming === 1,
        date: m.date,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
