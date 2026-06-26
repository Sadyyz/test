// api/boss.js
// GET    /api/boss?id=boss-vane   -> retorna dados de um boss
// POST   /api/boss?id=boss-vane   -> cria ou atualiza um boss (body = objeto boss completo)
// DELETE /api/boss?id=boss-vane   -> remove um boss (e seu avatar)
// GET    /api/boss                -> lista todos os bosses cadastrados

import { redis, initError } from './_redis.js';

// Índice com a lista de ids de bosses cadastrados, pra podermos listar todos
// sem precisar de SCAN (Upstash REST não garante SCAN consistente em todos os planos).
const INDEX_KEY = 'boss:index';

const MAX_SIZE = 256 * 1024;

function defaultVisibilidade(v) {
  v = v || {};
  return {
    imagem: Boolean(v.imagem),
    nome: Boolean(v.nome),
    hp: Boolean(v.hp)
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (initError) {
    return res.status(500).json({ error: 'Falha ao conectar no banco de dados', details: initError });
  }

  const { id } = req.query;

  // ── GET sem id: lista todos os bosses ─────────────────
  if (req.method === 'GET' && !id) {
    try {
      const index = (await redis.get(INDEX_KEY)) || [];
      const ids = Array.isArray(index) ? index : [];
      if (ids.length === 0) return res.status(200).json([]);

      const keys = ids.map(bid => `boss:${bid}`);
      const results = await redis.mget(...keys);
      const lista = results.filter(Boolean);
      return res.status(200).json(lista);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar bosses', details: String(err) });
    }
  }

  if (!id) {
    return res.status(400).json({ error: 'Parâmetro "id" é obrigatório. Ex: /api/boss?id=boss-vane' });
  }

  const key = `boss:${id}`;

  // ── GET com id ─────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      if (!data) return res.status(404).json({ error: 'Boss não encontrado' });

      // Migração automática: converte atributos D&D -> homebrew
      const attrs = data.atributos || {};
      const isDnD = 'forca' in attrs || 'destreza' in attrs || 'constituicao' in attrs;
      if (isDnD) {
        data.atributos = { razao: 5, vigor: 5, vontade: 5, expressao: 5 };
        await redis.set(key, data); // salva migrado
      }

      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar boss', details: String(err) });
    }
  }

  // ── POST: cria ou atualiza ─────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Corpo da requisição inválido' });
      }

      const serialized = JSON.stringify(body);
      if (serialized.length > MAX_SIZE) {
        return res.status(413).json({
          error: `Boss muito grande. Tamanho atual: ${Math.round(serialized.length / 1024)}KB. Máximo permitido: ${MAX_SIZE / 1024}KB.`
        });
      }

      const existente = await redis.get(key);

      const boss = {
        id,
        nome: String(body.nome ?? existente?.nome ?? ''),
        tipo: String(body.tipo ?? existente?.tipo ?? ''),
        categoria: String(body.categoria ?? existente?.categoria ?? 'Sem Categoria'),
        cr: body.cr ?? existente?.cr ?? '',
        hpMax: Number.isFinite(body.hpMax) ? body.hpMax : (existente?.hpMax ?? 10),
        hpAtual: Number.isFinite(body.hpAtual) ? body.hpAtual : (existente?.hpAtual ?? body.hpMax ?? existente?.hpMax ?? 10),
        ca: Number.isFinite(body.ca) ? body.ca : (existente?.ca ?? 10),
        atributos: body.atributos ?? existente?.atributos ?? {
          razao: 5, vigor: 5, vontade: 5, expressao: 5
        },
        acoes: Array.isArray(body.acoes) ? body.acoes : (existente?.acoes ?? []),
        habilidades: Array.isArray(body.habilidades) ? body.habilidades : (existente?.habilidades ?? []),
        notasMestre: String(body.notasMestre ?? existente?.notasMestre ?? ''),
        visibilidade: defaultVisibilidade(body.visibilidade ?? existente?.visibilidade)
      };

      await redis.set(key, boss);

      // Mantém o índice atualizado
      const index = (await redis.get(INDEX_KEY)) || [];
      const arr = Array.isArray(index) ? index : [];
      if (!arr.includes(id)) {
        arr.push(id);
        await redis.set(INDEX_KEY, arr);
      }

      return res.status(200).json(boss);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar boss', details: String(err) });
    }
  }

  // ── DELETE ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      await redis.del(key);
      await redis.del(`boss:avatar:${id}`);

      const index = (await redis.get(INDEX_KEY)) || [];
      const arr = (Array.isArray(index) ? index : []).filter(bid => bid !== id);
      await redis.set(INDEX_KEY, arr);

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao remover boss', details: String(err) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
