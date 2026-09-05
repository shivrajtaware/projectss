export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const orderId = req.query?.order_id;
  if (!orderId || !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) return res.status(400).json({ error: 'Order id or Cashfree configuration is missing.' });
  const base = process.env.CASHFREE_MODE === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  const response = await fetch(`${base}/orders/${encodeURIComponent(orderId)}`, { headers: { 'x-api-version': '2023-08-01', 'x-client-id': process.env.CASHFREE_CLIENT_ID, 'x-client-secret': process.env.CASHFREE_CLIENT_SECRET } });
  const data = await response.json();
  return res.status(response.status).json({ order_id: data.order_id, order_status: data.order_status, payment_status: data.order_status === 'PAID' ? 'PAID' : 'PENDING' });
};
