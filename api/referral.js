import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(401).json({ error: 'Authentication required.' });
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid session.' });
  const action = req.body?.action;
  if (action === 'attribute') {
    const code = String(req.body?.referralCode || '').trim().toUpperCase();
    if (!/^PV-[A-Z0-9]{8}$/.test(code)) return res.status(400).json({ error: 'Invalid referral code.' });
    const { data: referrer } = await admin.from('profiles').select('id').eq('referral_code', code).maybeSingle();
    if (!referrer || referrer.id === user.id) return res.status(400).json({ error: 'Referral is not eligible.' });
    const { data: existing } = await admin.from('referral_attributions').select('id').eq('referred_user_id', user.id).maybeSingle();
    if (existing) return res.status(200).json({ attributed: false, reason: 'already_attributed' });
    const { error } = await admin.from('referral_attributions').insert({ referral_code: code, referrer_id: referrer.id, referred_user_id: user.id });
    if (error && error.code !== '23505') return res.status(500).json({ error: 'Could not record referral.' });
    return res.status(200).json({ attributed: !error });
  }
  const { data: profile, error } = await admin.from('profiles').select('referral_code').eq('id', user.id).single();
  if (error) return res.status(500).json({ error: 'Referral profile is not ready.' });
  return res.status(200).json({ referralCode: profile.referral_code });
}
