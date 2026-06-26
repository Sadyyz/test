// api/boss-avatar.js
// GET    /api/boss-avatar?id=boss-vane   -> retorna a imagem (base64) do boss
// POST   /api/boss-avatar?id=boss-vane   -> salva a imagem (body = { avatar: "data:image/..." })
// DELETE /api/boss-avatar?id=boss-vane   -> remove a imagem

import { redis, initError } from './_redis.js';

// Limite maior que o avatar de jogador: arte de boss costuma ser mais pesada
const MAX_SIZE = 800 * 1024;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (initError) {
    return res.status(500).json({ error: 'Falha ao conectar no banco', details: initError });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Parâmetro "id" é obrigatório' });

  const key = `boss:avatar:${id}`;

  // ── GET ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      if (!data) return res.status(404).json({ avatar: null });
      return res.status(200).json({ avatar: data });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar imagem do boss', details: String(err) });
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
      return res.status(500).json({ error: 'Erro ao salvar imagem do boss', details: String(err) });
    }
  }

  // ── DELETE ───────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      await redis.del(key);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao remover imagem do boss', details: String(err) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
