// api/manifest.js
// GET    /api/manifest        -> retorna a lista de personagens criados dinamicamente
// POST   /api/manifest        -> adiciona um personagem novo na lista (body = { id, nome, subtitulo })
// DELETE /api/manifest?id=.. -> remove um personagem da lista
//
// Isso é separado do manifest.json (que é estático, parte do repositório).
// O index.html busca os dois e mostra a união: manifest.json (fichas "oficiais",
// versionadas no código) + manifest dinâmico (fichas criadas pela própria UI,
// guardadas no Redis).

import { Redis } from '@upstash/redis';

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

const KEY = 'manifest:extra';

// IDs reservados pelo manifest.json estático — nunca devem ser criados/apagados via API
const STATIC_IDS = ['mikhail'];

// Aceita só letras minúsculas, números e hífen (mesmo padrão usado pra id de ficha)
function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (initError) {
    return res.status(500).json({ error: 'Falha ao conectar no banco de dados', details: initError });
  }

  // ── GET: lista os personagens criados dinamicamente ──────────────
  if (req.method === 'GET') {
    try {
      const list = (await redis.get(KEY)) || [];
      return res.status(200).json(Array.isArray(list) ? list : []);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar manifest', details: String(err) });
    }
  }

  // ── POST: adiciona um personagem novo na lista ────────────────────
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const nome = String(body.nome || '').trim();
      if (!nome) {
        return res.status(400).json({ error: 'Campo "nome" é obrigatório' });
      }

      let id = slugify(body.id || nome);
      if (!id) {
        return res.status(400).json({ error: 'Não foi possível gerar um id válido a partir do nome' });
      }

      const list = (await redis.get(KEY)) || [];
      const arr = Array.isArray(list) ? list : [];

      // Garante id único: verifica tanto o Redis quanto o manifest.json estático
      let finalId = id;
      let n = 2;
      while (arr.some(p => p.id === finalId) || STATIC_IDS.includes(finalId)) {
        finalId = `${id}-${n}`;
        n++;
      }

      const novo = { id: finalId, nome, subtitulo: String(body.subtitulo || '') };
      arr.push(novo);
      await redis.set(KEY, arr);

      return res.status(200).json(novo);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar manifest', details: String(err) });
    }
  }

  // ── DELETE: remove um personagem da lista ────────────────────────
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Parâmetro "id" é obrigatório' });
      }

      // Protege fichas estáticas do manifest.json
      if (STATIC_IDS.includes(id)) {
        return res.status(403).json({ error: 'Este personagem faz parte do catálogo oficial e não pode ser removido pela UI.' });
      }

      const list = (await redis.get(KEY)) || [];
      const arr = Array.isArray(list) ? list : [];
      const idx = arr.findIndex(p => p.id === id);

      if (idx === -1) {
        return res.status(404).json({ error: 'Personagem não encontrado no manifest dinâmico' });
      }

      arr.splice(idx, 1);
      await redis.set(KEY, arr);

      // Remove também ficha e avatar do Redis para não deixar lixo
      await Promise.allSettled([
        redis.del(`ficha:${id}`),
        redis.del(`avatar:${id}`)
      ]);

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao remover personagem', details: String(err) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
