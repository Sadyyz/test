// api/obra.js
// PATCH /api/obra?id=mikhail   { ativada: true|false }
// GET   /api/obra?id=mikhail   -> { ativada: bool }
// Permite ao Mestre ativar/desativar a Obra Inacabada de um personagem
// sem sobrescrever a ficha inteira.

import { Redis } from '@upstash/redis';

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL   || process.env.REDIS_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
let initError = null;
try {
  if (!REDIS_URL || !REDIS_TOKEN) initError = 'Redis não configurado.';
  else redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
} catch (err) { initError = String(err); }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (initError) return res.status(500).json({ error: initError });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Parâmetro "id" obrigatório' });

  const key = `ficha:${id}`;

  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      if (!data) return res.status(404).json({ error: 'Ficha não encontrada' });
      return res.status(200).json({ ativada: !!data.obra_ativada });
    } catch (err) { return res.status(500).json({ error: String(err) }); }
  }

  if (req.method === 'PATCH') {
    try {
      const { ativada } = req.body || {};
      if (typeof ativada !== 'boolean') return res.status(400).json({ error: '"ativada" deve ser boolean' });

      const data = await redis.get(key);
      if (!data) return res.status(404).json({ error: 'Ficha não encontrada' });

      data.obra_ativada = ativada;
      await redis.set(key, data);
      return res.status(200).json({ ok: true, ativada });
    } catch (err) { return res.status(500).json({ error: String(err) }); }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
