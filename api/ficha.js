// api/ficha.js
// GET  /api/ficha?id=mikhail   -> retorna os dados salvos da ficha
// POST /api/ficha?id=mikhail   -> salva os dados (body = JSON da ficha)

import { readFileSync } from 'fs';
import { join } from 'path';

// Carrega fichas estáticas do repositório (ex: personagens/mikhail.json)
function loadStaticFicha(id) {
  try {
    const raw = readFileSync(join(process.cwd(), 'personagens', `${id}.json`), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

import { redis, initError } from './_redis.js';

// Limite de 512KB por ficha (JSON serializado). Protege o Redis de payloads gigantes
// com centenas de magias, itens ou relacionamentos.
const MAX_SIZE = 512 * 1024;

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
      if (data) return res.status(200).json({ ...data, id });
      // Fallback: tenta carregar ficha estática do repositório
      const staticData = loadStaticFicha(id);
      if (staticData) return res.status(200).json({ ...staticData, id });
      return res.status(404).json({ error: 'Ficha não encontrada' });
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

      // Valida tamanho antes de persistir
      const serialized = JSON.stringify(body);
      if (serialized.length > MAX_SIZE) {
        return res.status(413).json({
          error: `Ficha muito grande. Tamanho atual: ${Math.round(serialized.length / 1024)}KB. Máximo permitido: ${MAX_SIZE / 1024}KB.`
        });
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
