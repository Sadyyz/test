// api/ficha.js
// GET  /api/ficha?id=mikhail   -> retorna os dados salvos da ficha
// POST /api/ficha?id=mikhail   -> salva os dados (body = JSON da ficha)

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Parâmetro "id" é obrigatório. Ex: /api/ficha?id=mikhail' });
  }

  const key = `ficha:${id}`;

  if (req.method === 'GET') {
    try {
      const data = await kv.get(key);
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
      await kv.set(key, body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar ficha', details: String(err) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
