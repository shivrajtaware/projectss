import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => { res.status(status).json(body); };

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (req.headers['x-admin-password'] !== (process.env.ADMIN_PANEL_PASSWORD || 'admin123')) return json(res, 401, { error: 'Unauthorized' });
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await db.from('purchase_requests').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, { requests: data || [] });
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { projectId, projectName, name, email, phone } = req.body || {};
  if (!projectName || !name || !email || !phone) return json(res, 400, { error: 'Name, email and WhatsApp number are required.' });
  if (!/^\S+@\S+\.\S+$/.test(email) || String(phone).replace(/\D/g, '').length < 10) return json(res, 400, { error: 'Enter a valid email and WhatsApp number.' });
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await db.from('purchase_requests').insert({ project_id: String(projectId || ''), project_name: String(projectName).slice(0, 200), customer_name: String(name).slice(0, 120), customer_email: String(email).slice(0, 200), customer_phone: String(phone).slice(0, 40) }).select().single();
  if (error) return json(res, 500, { error: 'Request could not be saved. Please try again.' });
  return json(res, 201, { request: data });
}
