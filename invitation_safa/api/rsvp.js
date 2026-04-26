const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { guest_name, phone, guest_count, response_status } = req.body || {};

    if (!guest_name || !phone || !response_status) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    const count = Number.isInteger(Number(guest_count)) && Number(guest_count) > 0
      ? Number(guest_count)
      : 1;

    const normalizedPhone = String(phone).trim().replace(/\s+/g, '');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error: insertError } = await supabase
      .from('rsvp')
      .insert([
        {
          guest_name,
          phone: normalizedPhone,
          guest_count: count,
          response_status
        }
      ]);

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({
          error: 'Une réponse a déjà été enregistrée avec ce numéro 💌'
        });
      }

      return res.status(500).json({
        error: insertError.message
      });
    }

    const { data: rows, error: readError } = await supabase
      .from('rsvp')
      .select('guest_count')
      .eq('response_status', 'Présent');

    if (readError) {
      return res.status(500).json({ error: readError.message });
    }

    const totalAccepted = (rows || []).reduce(
      (sum, row) => sum + (Number(row.guest_count) || 0),
      0
    );

    return res.status(200).json({
      ok: true,
      totalAccepted
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};