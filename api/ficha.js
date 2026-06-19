// api/ficha.js
// GET  /api/ficha?id=mikhail   -> retorna os dados salvos da ficha
// POST /api/ficha?id=mikhail   -> salva os dados (body = JSON da ficha)

import { Redis } from '@upstash/redis';

// A Vercel pode injetar as credenciais com nomes diferentes dependendo de
// como a integração foi conectada (KV_* é o nome legado, UPSTASH_* é o atual).
// Aqui a gente tenta os dois, em vez de travar se um deles não existir.
const REDIS_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_URL;

const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
let initError = null;
try {
  if (!REDIS_URL || !REDIS_TOKEN) {
    initError = 'Variáveis de ambiente do Redis não encontradas. Verifique em Settings > Environment Variables se existe KV_REST_API_URL/KV_REST_API_TOKEN ou UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN, e se o banco está conectado a este projeto.';
  } else {
    redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  }
} catch (err) {
  initError = String(err);
}

export default async function handler(req, res) {
  if (initError) {
    return res.status(500).json({ error: 'Falha ao conectar no banco de dados', details: initError });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Parâmetro "id" é obrigatório. Ex: /api/ficha?id=mikhail' });
  }

  const key = `ficha:${id}`;

  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      if (!data) return res.status(404).json({ error: 'Ficha não encontrada' });
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar ficha', details: String(err) });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Corpo da requisição inválido' });
      }
      await redis.set(key, body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar ficha', details: String(err) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
