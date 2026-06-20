// api/diario.js
// GET  /api/diario?sessao=7   -> retorna dados da sessão (resumo, eventos, recursos)
// POST /api/diario?sessao=7   -> salva dados da sessão (body = objeto sessão completo)
// GET  /api/diario             -> lista todas as sessões cadastradas (resumo leve, sem corpo completo)

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

// Índice com os números de sessão cadastrados, pra listar todas sem SCAN
const INDEX_KEY = 'sessao:index';

const MAX_SIZE = 256 * 1024;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (initError) {
    return res.status(500).json({ error: 'Falha ao conectar no banco de dados', details: initError });
  }

  const { sessao } = req.query;

  // ── GET sem sessao: lista todas as sessões ────────────
  if (req.method === 'GET' && !sessao) {
    try {
      const index = (await redis.get(INDEX_KEY)) || [];
      const numeros = Array.isArray(index) ? index : [];
      if (numeros.length === 0) return res.status(200).json([]);

      const keys = numeros.map(n => `sessao:${n}`);
      const results = await redis.mget(...keys);
      const lista = results.filter(Boolean).sort((a, b) => (a.numero || 0) - (b.numero || 0));
      return res.status(200).json(lista);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar sessões', details: String(err) });
    }
  }

  if (!sessao) {
    return res.status(400).json({ error: 'Parâmetro "sessao" é obrigatório. Ex: /api/diario?sessao=7' });
  }

  const numero = Number(sessao);
  if (!Number.isFinite(numero)) {
    return res.status(400).json({ error: 'Parâmetro "sessao" deve ser numérico' });
  }

  const key = `sessao:${numero}`;

  // ── GET com sessao ────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      if (!data) return res.status(404).json({ error: 'Sessão não encontrada' });
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar sessão', details: String(err) });
    }
  }

  // ── POST: salva a sessão (diário + recursos) ──────────
  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Corpo da requisição inválido' });
      }

      const serialized = JSON.stringify(body);
      if (serialized.length > MAX_SIZE) {
        return res.status(413).json({
          error: `Sessão muito grande. Tamanho atual: ${Math.round(serialized.length / 1024)}KB. Máximo permitido: ${MAX_SIZE / 1024}KB.`
        });
      }

      const sessaoObj = {
        numero,
        titulo: String(body.titulo ?? ''),
        data: String(body.data ?? ''),
        resumo: String(body.resumo ?? ''),
        eventos: Array.isArray(body.eventos) ? body.eventos : [],
        recursos: (body.recursos && typeof body.recursos === 'object') ? body.recursos : {}
      };

      await redis.set(key, sessaoObj);

      const index = (await redis.get(INDEX_KEY)) || [];
      const arr = Array.isArray(index) ? index : [];
      if (!arr.includes(numero)) {
        arr.push(numero);
        await redis.set(INDEX_KEY, arr);
      }

      return res.status(200).json(sessaoObj);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar sessão', details: String(err) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
