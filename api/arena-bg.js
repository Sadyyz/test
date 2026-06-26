// api/arena-bg.js
// GET    /api/arena-bg   -> retorna a imagem de fundo da arena (base64 ou null)
// POST   /api/arena-bg   -> salva imagem (body = { bg: "data:image/..." | null })
// DELETE /api/arena-bg   -> remove imagem


import { redis, initError } from './_redis.js';

const KEY      = 'arena:bg';
const MAX_SIZE = 1200 * 1024; // 1.2MB em base64 ≈ ~900KB de imagem real

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (initError) return res.status(500).json({ error: initError });

  if (req.method === 'GET') {
    try {
      const data = await redis.get(KEY);
      return res.status(200).json({ bg: data || null });
    } catch (err) { return res.status(500).json({ error: String(err) }); }
  }

  if (req.method === 'POST') {
    try {
      const { bg } = req.body || {};
      if (bg === null || bg === undefined) {
        await redis.del(KEY);
        return res.status(200).json({ ok: true });
      }
      if (typeof bg !== 'string' || !bg.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Campo "bg" deve ser uma data URL de imagem ou null' });
      }
      if (bg.length > MAX_SIZE) {
        return res.status(413).json({ error: `Imagem muito grande. Máximo: ${MAX_SIZE / 1024}KB` });
      }
      await redis.set(KEY, bg);
      return res.status(200).json({ ok: true });
    } catch (err) { return res.status(500).json({ error: String(err) }); }
  }

  if (req.method === 'DELETE') {
    try {
      await redis.del(KEY);
      return res.status(200).json({ ok: true });
    } catch (err) { return res.status(500).json({ error: String(err) }); }
  }

  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
