// api/avatar.js
// GET  /api/avatar?id=mikhail        -> retorna o avatar (base64) do personagem
// POST /api/avatar?id=mikhail        -> salva o avatar (body = { avatar: "data:image/..." })
// DELETE /api/avatar?id=mikhail      -> remove o avatar

import { redis, initError } from './_redis.js';

// Limite: ~400KB por avatar (base64 de uma imagem comprimida)
const MAX_SIZE = 400 * 1024;

export default async function handler(req, res) {
  // CORS para o hub do mestre acessar de qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (initError) {
    return res.status(500).json({ error: 'Falha ao conectar no banco', details: initError });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Parâmetro "id" é obrigatório' });

  const key = `avatar:${id}`;

  // ── GET ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      if (!data) return res.status(404).json({ avatar: null });
      return res.status(200).json({ avatar: data });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar avatar', details: String(err) });
    }
  }

  // ── POST ─────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { avatar } = req.body || {};
      if (!avatar || typeof avatar !== 'string') {
        return res.status(400).json({ error: 'Campo "avatar" (base64) é obrigatório' });
      }
      if (!avatar.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Avatar deve ser uma data URL de imagem' });
      }
      if (avatar.length > MAX_SIZE) {
        return res.status(413).json({ error: `Imagem muito grande. Máximo permitido: ${MAX_SIZE / 1024}KB` });
      }
      await redis.set(key, avatar);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar avatar', details: String(err) });
    }
  }

  // ── DELETE ───────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      await redis.del(key);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao remover avatar', details: String(err) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
